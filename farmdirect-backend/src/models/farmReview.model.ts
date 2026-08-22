import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface FarmReviewRow {
  id: string;
  customer_id: string;
  customer_name: string;
  farm_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listFarmReviews(
  farmId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: FarmReviewRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<FarmReviewRow>(
      `SELECT r.id, r.customer_id, cp.full_name AS customer_name, r.farm_id, r.rating, r.comment, r.created_at
       FROM farm_reviews r
       JOIN customer_profiles cp ON cp.user_id = r.customer_id
       WHERE r.farm_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [farmId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM farm_reviews WHERE farm_id = $1`, [farmId]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export async function insertFarmReview(
  input: { customerId: string; farmId: string; rating: number; comment?: string | null },
  client?: PoolClient
): Promise<FarmReviewRow> {
  const res = await db(client).query<{ id: string; created_at: string }>(
    `INSERT INTO farm_reviews (customer_id, farm_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [input.customerId, input.farmId, input.rating, input.comment ?? null]
  );
  return {
    id: res.rows[0].id,
    customer_id: input.customerId,
    customer_name: "",
    farm_id: input.farmId,
    rating: input.rating,
    comment: input.comment ?? null,
    created_at: res.rows[0].created_at,
  };
}
