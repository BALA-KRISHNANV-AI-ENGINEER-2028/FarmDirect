import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  created_at: string;
  updated_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function findOAuthAccount(
  provider: string,
  providerAccountId: string,
  client?: PoolClient
): Promise<OAuthAccountRow | null> {
  const res = await db(client).query<OAuthAccountRow>(
    `SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_account_id = $2 LIMIT 1`,
    [provider, providerAccountId]
  );
  return res.rows[0] ?? null;
}

export async function insertOAuthAccount(
  input: { userId: string; provider: string; providerAccountId: string },
  client?: PoolClient
): Promise<OAuthAccountRow> {
  const res = await db(client).query<OAuthAccountRow>(
    `INSERT INTO oauth_accounts (user_id, provider, provider_account_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.userId, input.provider, input.providerAccountId]
  );
  return res.rows[0];
}
