import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface FarmerProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  experience_years: number | null;
  verified: boolean;
  story: string | null;
  rating_cached: string;
  review_count_cached: number;
  created_at: string;
  updated_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertFarmerProfile(
  input: {
    userId: string;
    fullName: string;
    avatarUrl?: string | null;
    experienceYears?: number | null;
    story?: string | null;
  },
  client?: PoolClient
): Promise<FarmerProfileRow> {
  const res = await db(client).query<FarmerProfileRow>(
    `INSERT INTO farmer_profiles (user_id, full_name, avatar_url, experience_years, story)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.userId, input.fullName, input.avatarUrl ?? null, input.experienceYears ?? null, input.story ?? null]
  );
  return res.rows[0];
}

export async function findFarmerProfileByUserId(
  userId: string,
  client?: PoolClient
): Promise<FarmerProfileRow | null> {
  const res = await db(client).query<FarmerProfileRow>(
    `SELECT * FROM farmer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function updateFarmerProfile(
  userId: string,
  fields: Partial<{
    fullName: string;
    avatarUrl: string | null;
    experienceYears: number | null;
    story: string | null;
  }>,
  client?: PoolClient
): Promise<FarmerProfileRow | null> {
  const res = await db(client).query<FarmerProfileRow>(
    `UPDATE farmer_profiles SET
       full_name = COALESCE($2, full_name),
       avatar_url = COALESCE($3, avatar_url),
       experience_years = COALESCE($4, experience_years),
       story = COALESCE($5, story)
     WHERE user_id = $1
     RETURNING *`,
    [userId, fields.fullName ?? null, fields.avatarUrl ?? null, fields.experienceYears ?? null, fields.story ?? null]
  );
  return res.rows[0] ?? null;
}

/** Recomputes rating_cached/review_count_cached from farmer_reviews — called after every review insert. */
export async function recomputeFarmerRatingCache(farmerId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `UPDATE farmer_profiles SET
       rating_cached = COALESCE((SELECT round(avg(rating)::numeric, 1) FROM farmer_reviews WHERE farmer_id = $1), 0),
       review_count_cached = (SELECT count(*) FROM farmer_reviews WHERE farmer_id = $1)
     WHERE user_id = $1`,
    [farmerId]
  );
}
