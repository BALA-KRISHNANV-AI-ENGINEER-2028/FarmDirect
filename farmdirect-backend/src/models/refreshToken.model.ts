import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertRefreshToken(
  input: { userId: string; tokenHash: string; expiresAt: Date },
  client?: PoolClient
): Promise<RefreshTokenRow> {
  const res = await db(client).query<RefreshTokenRow>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.userId, input.tokenHash, input.expiresAt.toISOString()]
  );
  return res.rows[0];
}

/** Returns the token row only if it's unrevoked and unexpired. */
export async function findActiveRefreshTokenByHash(
  tokenHash: string,
  client?: PoolClient
): Promise<RefreshTokenRow | null> {
  const res = await db(client).query<RefreshTokenRow>(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

export async function revokeRefreshTokenById(id: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [id]);
}

/** Used on password reset — force re-login on every device. */
export async function revokeAllRefreshTokensForUser(userId: string, client?: PoolClient): Promise<void> {
  await db(client).query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}
