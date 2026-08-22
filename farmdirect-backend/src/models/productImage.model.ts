import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface ProductImageRow {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listProductImages(productId: string, client?: PoolClient): Promise<ProductImageRow[]> {
  const res = await db(client).query<ProductImageRow>(
    `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC`,
    [productId]
  );
  return res.rows;
}

/** Returns a map of product_id -> first image url, for list views that only need a thumbnail. */
export async function getPrimaryImagesByProductIds(
  productIds: string[],
  client?: PoolClient
): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};
  const res = await db(client).query<{ product_id: string; url: string }>(
    `SELECT DISTINCT ON (product_id) product_id, url
     FROM product_images
     WHERE product_id = ANY($1::uuid[])
     ORDER BY product_id, sort_order ASC`,
    [productIds]
  );
  return Object.fromEntries(res.rows.map((r) => [r.product_id, r.url]));
}
