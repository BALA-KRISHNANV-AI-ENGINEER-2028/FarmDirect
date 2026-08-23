import type { PoolClient } from "pg";
import { pool } from "../config/database";

export type UserRole = "customer" | "farmer";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function findUserByEmail(email: string, client?: PoolClient): Promise<UserRow | null> {
  const res = await db(client).query<UserRow>(
    `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string, client?: PoolClient): Promise<UserRow | null> {
  const res = await db(client).query<UserRow>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ?? null;
}

export async function insertUser(
  input: { email: string; passwordHash: string; role: UserRole; phone?: string | null },
  client?: PoolClient
): Promise<UserRow> {
  const res = await db(client).query<UserRow>(
    `INSERT INTO users (email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, input.passwordHash, input.role, input.phone ?? null]
  );
  return res.rows[0];
}

export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string,
  client?: PoolClient
): Promise<void> {
  await db(client).query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [userId, passwordHash]);
}
