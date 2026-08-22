import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface InventoryMovementRow {
  id: string;
  product_id: string;
  change: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertInventoryMovement(
  input: { productId: string; change: number; reason: string; orderId?: string | null; note?: string | null },
  client?: PoolClient
): Promise<InventoryMovementRow> {
  const res = await db(client).query<InventoryMovementRow>(
    `INSERT INTO inventory_movements (product_id, change, reason, order_id, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.productId, input.change, input.reason, input.orderId ?? null, input.note ?? null]
  );
  return res.rows[0];
}

export async function listMovementsByProductId(
  productId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: InventoryMovementRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<InventoryMovementRow>(
      `SELECT * FROM inventory_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM inventory_movements WHERE product_id = $1`, [
      productId,
    ]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

/** Most recent movement per product — used to power the Farmer Inventory page's "last movement" column. */
export async function getLatestMovementsByProductIds(
  productIds: string[],
  client?: PoolClient
): Promise<Record<string, InventoryMovementRow>> {
  if (productIds.length === 0) return {};
  const res = await db(client).query<InventoryMovementRow>(
    `SELECT DISTINCT ON (product_id) *
     FROM inventory_movements
     WHERE product_id = ANY($1::uuid[])
     ORDER BY product_id, created_at DESC`,
    [productIds]
  );
  return Object.fromEntries(res.rows.map((r) => [r.product_id, r]));
}
