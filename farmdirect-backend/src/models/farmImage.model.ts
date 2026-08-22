import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface FarmImageRow {
  id: string;
  farm_id: string;
  url: string;
  sort_order: number;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listFarmImages(farmId: string, client?: PoolClient): Promise<FarmImageRow[]> {
  const res = await db(client).query<FarmImageRow>(
    `SELECT * FROM farm_images WHERE farm_id = $1 ORDER BY sort_order ASC`,
    [farmId]
  );
  return res.rows;
}

/** Returns a map of farm_id -> first image url, for list views that only need a thumbnail. */
export async function getPrimaryImagesByFarmIds(
  farmIds: string[],
  client?: PoolClient
): Promise<Record<string, string>> {
  if (farmIds.length === 0) return {};
  const res = await db(client).query<{ farm_id: string; url: string }>(
    `SELECT DISTINCT ON (farm_id) farm_id, url
     FROM farm_images
     WHERE farm_id = ANY($1::uuid[])
     ORDER BY farm_id, sort_order ASC`,
    [farmIds]
  );
  return Object.fromEntries(res.rows.map((r) => [r.farm_id, r.url]));
}
