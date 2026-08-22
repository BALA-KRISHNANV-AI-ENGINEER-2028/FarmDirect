import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  delivery_address_id: string | null;
  delivery_address_snapshot: unknown;
  delivery_method: string | null;
  payment_method: string | null;
  subtotal: string;
  delivery_fee: string;
  total: string;
  estimated_delivery_at: string | null;
  placed_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  farm_id: string;
  name_snapshot: string;
  unit_snapshot: string;
  price_snapshot: string;
  quantity: number;
  created_at: string;
  // joined for convenience
  farm_name: string;
  farmer_id: string;
  product_image: string | null;
}

const db = (client?: PoolClient) => client ?? pool;

/**
 * Order numbers are a short human-friendly code ("FD-XXXX"), separate from
 * the uuid primary key — generated with a retry loop rather than a DB
 * sequence, since node-pg-migrate sequences would be one more schema object
 * to manage for a value that's cosmetic (the uuid `id` is what every FK
 * actually points at). Collisions are rare (4-digit space) and cheaply
 * retried against the `orders.order_number` unique index.
 */
function randomOrderNumber(): string {
  return `FD-${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface CreateOrderInput {
  customerId: string;
  deliveryAddressId: string | null;
  deliveryAddressSnapshot: unknown;
  deliveryMethod: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimatedDeliveryAt: Date;
}

export async function insertOrder(input: CreateOrderInput, client?: PoolClient): Promise<OrderRow> {
  const conn = db(client);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await conn.query<OrderRow>(
        `INSERT INTO orders
           (order_number, customer_id, status, delivery_address_id, delivery_address_snapshot,
            delivery_method, payment_method, subtotal, delivery_fee, total, estimated_delivery_at)
         VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          randomOrderNumber(),
          input.customerId,
          input.deliveryAddressId,
          JSON.stringify(input.deliveryAddressSnapshot),
          input.deliveryMethod,
          input.paymentMethod,
          input.subtotal,
          input.deliveryFee,
          input.total,
          input.estimatedDeliveryAt.toISOString(),
        ]
      );
      return res.rows[0];
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505" && attempt < 4) continue; // unique_violation on order_number — retry
      throw err;
    }
  }
  throw new Error("Failed to generate a unique order number after several attempts");
}

export async function insertOrderItem(
  input: {
    orderId: string;
    productId: string;
    farmId: string;
    nameSnapshot: string;
    unitSnapshot: string;
    priceSnapshot: number;
    quantity: number;
  },
  client?: PoolClient
): Promise<void> {
  await db(client).query(
    `INSERT INTO order_items (order_id, product_id, farm_id, name_snapshot, unit_snapshot, price_snapshot, quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.orderId, input.productId, input.farmId, input.nameSnapshot, input.unitSnapshot, input.priceSnapshot, input.quantity]
  );
}

export async function findOrderById(id: string, client?: PoolClient): Promise<OrderRow | null> {
  const res = await db(client).query<OrderRow>(`SELECT * FROM orders WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ?? null;
}

export async function listOrderItemsByOrderId(orderId: string, client?: PoolClient): Promise<OrderItemRow[]> {
  const res = await db(client).query<OrderItemRow>(
    `SELECT oi.*, f.name AS farm_name, f.farmer_id,
            (SELECT url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order LIMIT 1) AS product_image
     FROM order_items oi
     JOIN farms f ON f.id = oi.farm_id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at ASC`,
    [orderId]
  );
  return res.rows;
}

export async function listOrdersByCustomerId(
  customerId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: OrderRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<OrderRow>(
      `SELECT * FROM orders WHERE customer_id = $1 ORDER BY placed_at DESC LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM orders WHERE customer_id = $1`, [customerId]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

/** Orders that include at least one item from one of this farmer's farms — backs the farmer kanban view. */
export async function listOrdersForFarmer(
  farmerId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: OrderRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<OrderRow>(
      `SELECT DISTINCT o.*
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN farms f ON f.id = oi.farm_id
       WHERE f.farmer_id = $1
       ORDER BY o.placed_at DESC
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    ),
    db(client).query<{ count: string }>(
      `SELECT count(DISTINCT o.id)
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN farms f ON f.id = oi.farm_id
       WHERE f.farmer_id = $1`,
      [farmerId]
    ),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

/** Used for the customer|farmer access check on GET /api/orders/:id. */
export async function farmerHasItemOnOrder(orderId: string, farmerId: string, client?: PoolClient): Promise<boolean> {
  const res = await db(client).query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM order_items oi JOIN farms f ON f.id = oi.farm_id
       WHERE oi.order_id = $1 AND f.farmer_id = $2
     ) AS exists`,
    [orderId, farmerId]
  );
  return res.rows[0]?.exists ?? false;
}

export async function updateOrderStatus(orderId: string, status: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE orders SET status = $2 WHERE id = $1`, [orderId, status]);
}
