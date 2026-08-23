import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface FarmerReviewRow {
  id: string;
  customer_id: string;
  customer_name: string;
  farmer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listFarmerReviews(
  farmerId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: FarmerReviewRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<FarmerReviewRow>(
      `SELECT r.id, r.customer_id, cp.full_name AS customer_name, r.farmer_id, r.rating, r.comment, r.created_at
       FROM farmer_reviews r
       JOIN customer_profiles cp ON cp.user_id = r.customer_id
       WHERE r.farmer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM farmer_reviews WHERE farmer_id = $1`, [farmerId]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export async function insertFarmerReview(
  input: { customerId: string; farmerId: string; rating: number; comment?: string | null },
  client?: PoolClient
): Promise<FarmerReviewRow> {
  const res = await db(client).query<{ id: string; created_at: string }>(
    `INSERT INTO farmer_reviews (customer_id, farmer_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [input.customerId, input.farmerId, input.rating, input.comment ?? null]
  );
  return {
    id: res.rows[0].id,
    customer_id: input.customerId,
    customer_name: "",
    farmer_id: input.farmerId,
    rating: input.rating,
    comment: input.comment ?? null,
    created_at: res.rows[0].created_at,
  };
}
