import type { PoolClient } from "pg";
import { pool } from "../config/database";

const db = (client?: PoolClient) => client ?? pool;

export async function addFarmFavorite(customerId: string, farmId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `INSERT INTO farm_favorites (customer_id, farm_id) VALUES ($1, $2)
     ON CONFLICT (customer_id, farm_id) DO NOTHING`,
    [customerId, farmId]
  );
}

export async function removeFarmFavorite(customerId: string, farmId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM farm_favorites WHERE customer_id = $1 AND farm_id = $2`, [
    customerId,
    farmId,
  ]);
}

export async function listFavoriteFarmIds(customerId: string, client?: PoolClient): Promise<string[]> {
  const res = await db(client).query<{ farm_id: string }>(
    `SELECT farm_id FROM farm_favorites WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return res.rows.map((r) => r.farm_id);
}
