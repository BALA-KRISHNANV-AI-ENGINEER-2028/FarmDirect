import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface FarmRow {
  id: string;
  farmer_id: string;
  name: string;
  description: string | null;
  category: string | null;
  size_acres: string | null;
  farming_method: string | null;
  years_active: number | null;
  verified: boolean;
  address_line: string | null;
  rating_cached: string;
  review_count_cached: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farmer_name: string;
  /** Extracted from the PostGIS geography column; null when location is not set. */
  lat: number | null;
  lng: number | null;
}

const db = (client?: PoolClient) => client ?? pool;

export interface ListFarmsFilters {
  category?: string;
  verifiedOnly?: boolean;
  search?: string;
}

export async function listFarms(
  filters: ListFarmsFilters,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: FarmRow[]; total: number }> {
  const conditions: string[] = ["f.is_active = true"];
  const params: unknown[] = [];

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`f.category = $${params.length}`);
  }
  if (filters.verifiedOnly) {
    conditions.push(`f.verified = true`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(f.name ILIKE $${params.length} OR f.address_line ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rowsRes = await db(client).query<FarmRow>(
    `SELECT f.*, fp.full_name AS farmer_name,
            ST_Y(f.location::geometry) AS lat,
            ST_X(f.location::geometry) AS lng
     FROM farms f
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     ${whereClause}
     ORDER BY f.verified DESC, f.rating_cached DESC, f.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countRes = await db(client).query<{ count: string }>(
    `SELECT count(*) FROM farms f ${whereClause}`,
    params
  );

  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export async function findFarmById(id: string, client?: PoolClient): Promise<FarmRow | null> {
  const res = await db(client).query<FarmRow>(
    `SELECT f.*, fp.full_name AS farmer_name,
            ST_Y(f.location::geometry) AS lat,
            ST_X(f.location::geometry) AS lng
     FROM farms f
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     WHERE f.id = $1 AND f.is_active = true
     LIMIT 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function listFarmsByFarmerId(farmerId: string, client?: PoolClient): Promise<FarmRow[]> {
  const res = await db(client).query<FarmRow>(
    `SELECT f.*, fp.full_name AS farmer_name,
            ST_Y(f.location::geometry) AS lat,
            ST_X(f.location::geometry) AS lng
     FROM farms f
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     WHERE f.farmer_id = $1 AND f.is_active = true
     ORDER BY f.created_at DESC`,
    [farmerId]
  );
  return res.rows;
}

export interface FarmWithDistanceRow extends FarmRow {
  distance_km: string;
}

export interface NearbyFarmsFilters {
  category?: string;
  verifiedOnly?: boolean;
}

/**
 * PostGIS radius search per the approved strategy (architecture doc §6):
 * geography distance in meters converted to km, ST_DWithin to filter by
 * radius, and the `<->` KNN operator to drive ORDER BY off the GIST index
 * instead of computing ST_Distance for every row before sorting. Farms with
 * no location set (location IS NULL) never match — ST_DWithin against NULL
 * is NULL, which the WHERE clause treats as false, so they're silently
 * excluded rather than erroring.
 */
export async function listFarmsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  filters: NearbyFarmsFilters,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: FarmWithDistanceRow[]; total: number }> {
  const conditions: string[] = [
    "f.is_active = true",
    "ST_DWithin(f.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)",
  ];
  const params: unknown[] = [lng, lat, radiusKm];

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`f.category = $${params.length}`);
  }
  if (filters.verifiedOnly) {
    conditions.push(`f.verified = true`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const rowsRes = await db(client).query<FarmWithDistanceRow>(
    `SELECT f.*, fp.full_name AS farmer_name,
            ST_Y(f.location::geometry) AS lat,
            ST_X(f.location::geometry) AS lng,
            round((ST_Distance(f.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS distance_km
     FROM farms f
     JOIN farmer_profiles fp ON fp.user_id = f.farmer_id
     ${whereClause}
     ORDER BY f.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countRes = await db(client).query<{ count: string }>(
    `SELECT count(*) FROM farms f ${whereClause}`,
    params
  );

  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export interface CreateFarmInput {
  farmerId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  sizeAcres?: number | null;
  farmingMethod?: string | null;
  yearsActive?: number | null;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * `latitude`/`longitude` are optional at creation — matches the PostGIS
 * write path from the architecture doc (§6): a farmer can add/update their
 * farm's location later via the Farm Profile → Location tab. When both are
 * present, `location` is built with ST_SetSRID/ST_MakePoint; otherwise it's
 * left NULL and the farm simply won't appear in nearby-radius results until
 * a location is set.
 */
export async function insertFarm(input: CreateFarmInput, client?: PoolClient): Promise<FarmRow> {
  const hasLocation = input.latitude != null && input.longitude != null;
  const res = await db(client).query<FarmRow>(
    `INSERT INTO farms
       (farmer_id, name, description, category, size_acres, farming_method, years_active, address_line, location)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8,
        CASE WHEN $9::boolean THEN ST_SetSRID(ST_MakePoint($10::double precision, $11::double precision), 4326)::geography ELSE NULL END)
     RETURNING id, farmer_id, name, description, category, size_acres, farming_method, years_active,
               verified, address_line, rating_cached, review_count_cached, is_active, created_at, updated_at`,
    [
      input.farmerId,
      input.name,
      input.description ?? null,
      input.category ?? null,
      input.sizeAcres ?? null,
      input.farmingMethod ?? null,
      input.yearsActive ?? null,
      input.addressLine ?? null,
      hasLocation,
      input.longitude ?? null,
      input.latitude ?? null,
    ]
  );
  // farmer_name isn't returned by this INSERT (no join) — callers that need
  // it should re-fetch via findFarmById, or the caller already has it.
  return { ...res.rows[0], farmer_name: "" };
}

export interface UpdateFarmInput {
  name?: string;
  description?: string | null;
  category?: string | null;
  sizeAcres?: number | null;
  farmingMethod?: string | null;
  yearsActive?: number | null;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function updateFarm(id: string, fields: UpdateFarmInput, client?: PoolClient): Promise<FarmRow | null> {
  const hasLocation = fields.latitude != null && fields.longitude != null;
  const res = await db(client).query<FarmRow>(
    `UPDATE farms SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       category = COALESCE($4, category),
       size_acres = COALESCE($5, size_acres),
       farming_method = COALESCE($6, farming_method),
       years_active = COALESCE($7, years_active),
       address_line = COALESCE($8, address_line),
       location = CASE WHEN $9::boolean THEN ST_SetSRID(ST_MakePoint($10::double precision, $11::double precision), 4326)::geography ELSE location END
     WHERE id = $1 AND is_active = true
     RETURNING id, farmer_id, name, description, category, size_acres, farming_method, years_active,
               verified, address_line, rating_cached, review_count_cached, is_active, created_at, updated_at`,
    [
      id,
      fields.name ?? null,
      fields.description ?? null,
      fields.category ?? null,
      fields.sizeAcres ?? null,
      fields.farmingMethod ?? null,
      fields.yearsActive ?? null,
      fields.addressLine ?? null,
      hasLocation,
      fields.longitude ?? null,
      fields.latitude ?? null,
    ]
  );
  if (!res.rows[0]) return null;
  return { ...res.rows[0], farmer_name: "" };
}

/** Soft delete — matches the API architecture doc (DELETE /api/farms/:id: "soft delete"). */
export async function softDeleteFarm(id: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE farms SET is_active = false WHERE id = $1`, [id]);
}

/** Used by ownership middleware — cheap lookup that doesn't join farmer_profiles. */
export async function findFarmOwnerId(id: string, client?: PoolClient): Promise<string | null> {
  const res = await db(client).query<{ farmer_id: string }>(
    `SELECT farmer_id FROM farms WHERE id = $1 AND is_active = true LIMIT 1`,
    [id]
  );
  return res.rows[0]?.farmer_id ?? null;
}

/** Recomputes rating_cached/review_count_cached from farm_reviews — called after every review insert. */
export async function recomputeFarmRatingCache(farmId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `UPDATE farms SET
       rating_cached = COALESCE((SELECT round(avg(rating)::numeric, 1) FROM farm_reviews WHERE farm_id = $1), 0),
       review_count_cached = (SELECT count(*) FROM farm_reviews WHERE farm_id = $1)
     WHERE id = $1`,
    [farmId]
  );
}
