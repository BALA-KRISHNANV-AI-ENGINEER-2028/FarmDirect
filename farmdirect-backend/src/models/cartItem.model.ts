import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface CartItemRow {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // joined product fields
  product_name: string;
  product_image: string | null;
  price: string;
  unit: string;
  availability: string;
  stock: number;
  farm_id: string;
  farm_name: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listCartItemsByCustomerId(customerId: string, client?: PoolClient): Promise<CartItemRow[]> {
  const res = await db(client).query<CartItemRow>(
    `SELECT ci.id, ci.customer_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
            p.name AS product_name, p.price, p.unit, p.availability, p.stock,
            p.farm_id, f.name AS farm_name,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN farms f ON f.id = p.farm_id
     WHERE ci.customer_id = $1
     ORDER BY ci.created_at ASC`,
    [customerId]
  );
  return res.rows;
}

/** Adds to cart — increments quantity if the product is already present, matching useCart's addItem. */
export async function upsertCartItem(
  customerId: string,
  productId: string,
  quantity: number,
  client?: PoolClient
): Promise<void> {
  await db(client).query(
    `INSERT INTO cart_items (customer_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (customer_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()`,
    [customerId, productId, quantity]
  );
}

/** Sets an absolute quantity (PUT semantics) rather than incrementing. */
export async function setCartItemQuantity(
  customerId: string,
  productId: string,
  quantity: number,
  client?: PoolClient
): Promise<boolean> {
  const res = await db(client).query(
    `UPDATE cart_items SET quantity = $3, updated_at = now() WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId, quantity]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function deleteCartItem(customerId: string, productId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM cart_items WHERE customer_id = $1 AND product_id = $2`, [
    customerId,
    productId,
  ]);
}

export async function clearCart(customerId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM cart_items WHERE customer_id = $1`, [customerId]);
}
