import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface CustomerProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertCustomerProfile(
  input: { userId: string; fullName: string; avatarUrl?: string | null; dateOfBirth?: string | null },
  client?: PoolClient
): Promise<CustomerProfileRow> {
  const res = await db(client).query<CustomerProfileRow>(
    `INSERT INTO customer_profiles (user_id, full_name, avatar_url, date_of_birth)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.userId, input.fullName, input.avatarUrl ?? null, input.dateOfBirth ?? null]
  );
  return res.rows[0];
}

export async function findCustomerProfileByUserId(
  userId: string,
  client?: PoolClient
): Promise<CustomerProfileRow | null> {
  const res = await db(client).query<CustomerProfileRow>(
    `SELECT * FROM customer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function updateCustomerProfile(
  userId: string,
  fields: Partial<{ fullName: string; avatarUrl: string | null; dateOfBirth: string | null }>,
  client?: PoolClient
): Promise<CustomerProfileRow | null> {
  const res = await db(client).query<CustomerProfileRow>(
    `UPDATE customer_profiles SET
       full_name = COALESCE($2, full_name),
       avatar_url = COALESCE($3, avatar_url),
       date_of_birth = COALESCE($4, date_of_birth)
     WHERE user_id = $1
     RETURNING *`,
    [userId, fields.fullName ?? null, fields.avatarUrl ?? null, fields.dateOfBirth ?? null]
  );
  return res.rows[0] ?? null;
}
