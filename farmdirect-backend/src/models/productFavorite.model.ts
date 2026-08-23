import type { PoolClient } from "pg";
import { pool } from "../config/database";

const db = (client?: PoolClient) => client ?? pool;

/** Idempotent — favoriting an already-favorited product is a no-op, not an error. */
export async function addProductFavorite(customerId: string, productId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `INSERT INTO product_favorites (customer_id, product_id) VALUES ($1, $2)
     ON CONFLICT (customer_id, product_id) DO NOTHING`,
    [customerId, productId]
  );
}

export async function removeProductFavorite(customerId: string, productId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM product_favorites WHERE customer_id = $1 AND product_id = $2`, [
    customerId,
    productId,
  ]);
}

export async function listFavoriteProductIds(customerId: string, client?: PoolClient): Promise<string[]> {
  const res = await db(client).query<{ product_id: string }>(
    `SELECT product_id FROM product_favorites WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return res.rows.map((r) => r.product_id);
}
