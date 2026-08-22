import type { PoolClient } from "pg";
import { pool } from "../config/database";

const db = (client?: PoolClient) => client ?? pool;

export async function addFarmerFavorite(customerId: string, farmerId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `INSERT INTO farmer_favorites (customer_id, farmer_id) VALUES ($1, $2)
     ON CONFLICT (customer_id, farmer_id) DO NOTHING`,
    [customerId, farmerId]
  );
}

export async function removeFarmerFavorite(customerId: string, farmerId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM farmer_favorites WHERE customer_id = $1 AND farmer_id = $2`, [
    customerId,
    farmerId,
  ]);
}

export async function listFavoriteFarmerIds(customerId: string, client?: PoolClient): Promise<string[]> {
  const res = await db(client).query<{ farmer_id: string }>(
    `SELECT farmer_id FROM farmer_favorites WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return res.rows.map((r) => r.farmer_id);
}
