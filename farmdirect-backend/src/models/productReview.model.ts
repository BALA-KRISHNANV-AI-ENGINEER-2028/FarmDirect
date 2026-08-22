import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface ProductReviewRow {
  id: string;
  customer_id: string;
  customer_name: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listProductReviews(
  productId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: ProductReviewRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<ProductReviewRow>(
      `SELECT r.id, r.customer_id, cp.full_name AS customer_name, r.product_id, r.rating, r.comment, r.created_at
       FROM product_reviews r
       JOIN customer_profiles cp ON cp.user_id = r.customer_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM product_reviews WHERE product_id = $1`, [productId]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

/**
 * Throws a raw pg error with code '23505' (unique_violation) if this
 * customer has already reviewed this product — caller (review.service.ts)
 * catches that specific code and translates it into a clean 409, the same
 * pattern used for the Phase E stock guard rather than letting a DB
 * constraint surface as an unhandled 500.
 */
export async function insertProductReview(
  input: { customerId: string; productId: string; rating: number; comment?: string | null },
  client?: PoolClient
): Promise<ProductReviewRow> {
  const res = await db(client).query<{ id: string; created_at: string }>(
    `INSERT INTO product_reviews (customer_id, product_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [input.customerId, input.productId, input.rating, input.comment ?? null]
  );
  return {
    id: res.rows[0].id,
    customer_id: input.customerId,
    customer_name: "",
    product_id: input.productId,
    rating: input.rating,
    comment: input.comment ?? null,
    created_at: res.rows[0].created_at,
  };
}
