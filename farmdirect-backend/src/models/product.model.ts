import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface ProductRow {
  id: string;
  farm_id: string;
  farm_farmer_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: string;
  unit: string;
  farming_method: string | null;
  harvest_date: string | null;
  stock: number;
  availability: string;
  low_stock_threshold: number;
  rating_cached: string;
  review_count_cached: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farm_name: string;
  farmer_name: string;
}

const db = (client?: PoolClient) => client ?? pool;

export type ProductSort = "newest" | "price_asc" | "price_desc" | "rating";

export interface ListProductsFilters {
  category?: string;
  search?: string;
  farmId?: string;
  sort?: ProductSort;
}

const sortColumns: Record<ProductSort, string> = {
  newest: "p.created_at DESC",
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  rating: "p.rating_cached DESC",
};

export async function listProducts(
  filters: ListProductsFilters,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: ProductRow[]; total: number }> {
  const conditions: string[] = ["p.is_active = true"];
  const params: unknown[] = [];

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`p.category = $${params.length}`);
  }
  if (filters.farmId) {
    params.push(filters.farmId);
    conditions.push(`p.farm_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR f.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.category ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = sortColumns[filters.sort ?? "newest"];

  const rowsRes = await db(client).query<ProductRow>(
    `SELECT p.*, f.name AS farm_name, f.farmer_id AS farm_farmer_id, fp.full_name AS farmer_name
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countRes = await db(client).query<{ count: string }>(
    `SELECT count(*) FROM products p JOIN farms f ON f.id = p.farm_id ${whereClause}`,
    params
  );

  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export async function findProductById(id: string, client?: PoolClient): Promise<ProductRow | null> {
  const res = await db(client).query<ProductRow>(
    `SELECT p.*, f.name AS farm_name, f.farmer_id AS farm_farmer_id, fp.full_name AS farmer_name
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     WHERE p.id = $1 AND p.is_active = true
     LIMIT 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function listRelatedProducts(
  productId: string,
  category: string | null,
  limit: number,
  client?: PoolClient
): Promise<ProductRow[]> {
  if (!category) return [];
  const res = await db(client).query<ProductRow>(
    `SELECT p.*, f.name AS farm_name, f.farmer_id AS farm_farmer_id, fp.full_name AS farmer_name
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     WHERE p.category = $1 AND p.id != $2 AND p.is_active = true
     ORDER BY p.rating_cached DESC
     LIMIT $3`,
    [category, productId, limit]
  );
  return res.rows;
}

export interface CreateProductInput {
  farmId: string;
  name: string;
  category?: string | null;
  description?: string | null;
  price: number;
  unit: string;
  farmingMethod?: string | null;
  harvestDate?: string | null;
  stock: number;
  lowStockThreshold?: number;
  images?: string[];
}

function computeAvailability(stock: number, lowStockThreshold: number): string {
  if (stock <= 0) return "Out of Stock";
  if (stock <= lowStockThreshold) return "Low Stock";
  return "In Stock";
}

export async function insertProduct(input: CreateProductInput, client?: PoolClient): Promise<ProductRow> {
  const lowStockThreshold = input.lowStockThreshold ?? 5;
  const availability = computeAvailability(input.stock, lowStockThreshold);
  const res = await db(client).query<{ id: string }>(
    `INSERT INTO products
       (farm_id, name, category, description, price, unit, farming_method, harvest_date, stock, availability, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.farmId,
      input.name,
      input.category ?? null,
      input.description ?? null,
      input.price,
      input.unit,
      input.farmingMethod ?? null,
      input.harvestDate ?? null,
      input.stock,
      availability,
      lowStockThreshold,
    ]
  );
  const productId = res.rows[0].id;

  if (input.images?.length) {
    for (let i = 0; i < input.images.length; i++) {
      await db(client).query(`INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, $3)`, [
        productId,
        input.images[i],
        i,
      ]);
    }
  }

  const created = await findProductById(productId, client);
  // Guaranteed non-null: we just created it in the same (possibly transactional) connection.
  return created as ProductRow;
}

export interface UpdateProductInput {
  name?: string;
  category?: string | null;
  description?: string | null;
  price?: number;
  unit?: string;
  farmingMethod?: string | null;
  harvestDate?: string | null;
  lowStockThreshold?: number;
  images?: string[];
}

export async function updateProduct(
  id: string,
  fields: UpdateProductInput,
  client?: PoolClient
): Promise<ProductRow | null> {
  await db(client).query(
    `UPDATE products SET
       name = COALESCE($2, name),
       category = COALESCE($3, category),
       description = COALESCE($4, description),
       price = COALESCE($5, price),
       unit = COALESCE($6, unit),
       farming_method = COALESCE($7, farming_method),
       harvest_date = COALESCE($8, harvest_date),
       low_stock_threshold = COALESCE($9, low_stock_threshold)
     WHERE id = $1 AND is_active = true`,
    [
      id,
      fields.name ?? null,
      fields.category ?? null,
      fields.description ?? null,
      fields.price ?? null,
      fields.unit ?? null,
      fields.farmingMethod ?? null,
      fields.harvestDate ?? null,
      fields.lowStockThreshold ?? null,
    ]
  );

  // Full replace, not append — matches how the Edit Product form resubmits
  // the complete current image set rather than diffing additions/removals.
  if (fields.images) {
    await db(client).query(`DELETE FROM product_images WHERE product_id = $1`, [id]);
    for (let i = 0; i < fields.images.length; i++) {
      await db(client).query(`INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, $3)`, [
        id,
        fields.images[i],
        i,
      ]);
    }
  }

  return findProductById(id, client);
}

/** Soft delete — matches the API architecture doc (DELETE /api/products/:id: "soft delete (is_active=false)"). */
export async function softDeleteProduct(id: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE products SET is_active = false WHERE id = $1`, [id]);
}

/**
 * Applies a stock delta and recomputes `availability` from the new stock
 * vs. `low_stock_threshold`, in one statement so the two columns can never
 * drift out of sync with each other. Returns the new stock so the caller
 * (inventory service) can reject the change before committing if it would
 * go negative — see the CHECK constraint on `products.stock` as the last
 * line of defense, but the service should produce a clean 409 first.
 */
export async function applyStockChange(
  productId: string,
  change: number,
  client?: PoolClient
): Promise<{ stock: number; availability: string } | null> {
  // The WHERE guard (stock + change >= 0) prevents hitting the DB's CHECK
  // constraint at all — a constraint violation would abort the whole
  // transaction with a raw Postgres error instead of a clean, catchable
  // "no rows updated" the service layer can turn into a 409.
  const res = await db(client).query<{ stock: number; low_stock_threshold: number }>(
    `UPDATE products
     SET stock = stock + $2
     WHERE id = $1 AND is_active = true AND stock + $2 >= 0
     RETURNING stock, low_stock_threshold`,
    [productId, change]
  );
  const row = res.rows[0];
  if (!row) return null;

  const availability = computeAvailability(row.stock, row.low_stock_threshold);
  await db(client).query(`UPDATE products SET availability = $2 WHERE id = $1`, [productId, availability]);
  return { stock: row.stock, availability };
}

/** Used by ownership middleware — cheap lookup that doesn't join farms/farmer_profiles. */
export async function findProductOwnerId(productId: string, client?: PoolClient): Promise<string | null> {
  const res = await db(client).query<{ farmer_id: string }>(
    `SELECT f.farmer_id
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     WHERE p.id = $1 AND p.is_active = true
     LIMIT 1`,
    [productId]
  );
  return res.rows[0]?.farmer_id ?? null;
}

/** Recomputes rating_cached/review_count_cached from product_reviews — called after every review insert. */
export async function recomputeProductRatingCache(productId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `UPDATE products SET
       rating_cached = COALESCE((SELECT round(avg(rating)::numeric, 1) FROM product_reviews WHERE product_id = $1), 0),
       review_count_cached = (SELECT count(*) FROM product_reviews WHERE product_id = $1)
     WHERE id = $1`,
    [productId]
  );
}

export async function listProductsByFarmerId(farmerId: string, client?: PoolClient): Promise<ProductRow[]> {
  const res = await db(client).query<ProductRow>(
    `SELECT p.*, f.name AS farm_name, f.farmer_id AS farm_farmer_id, fp.full_name AS farmer_name
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     WHERE f.farmer_id = $1 AND p.is_active = true
     ORDER BY p.created_at DESC`,
    [farmerId]
  );
  return res.rows;
}
