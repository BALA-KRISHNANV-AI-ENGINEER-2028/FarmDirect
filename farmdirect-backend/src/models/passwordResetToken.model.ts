import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertPasswordResetToken(
  input: { userId: string; tokenHash: string; expiresAt: Date },
  client?: PoolClient
): Promise<PasswordResetTokenRow> {
  const res = await db(client).query<PasswordResetTokenRow>(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.userId, input.tokenHash, input.expiresAt.toISOString()]
  );
  return res.rows[0];
}

/** Returns the token row only if it's unconsumed (revoked_at IS NULL) and unexpired. */
export async function findActivePasswordResetTokenByHash(
  tokenHash: string,
  client?: PoolClient
): Promise<PasswordResetTokenRow | null> {
  const res = await db(client).query<PasswordResetTokenRow>(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

/** Marks a reset token as consumed so it can't be used a second time. */
export async function consumePasswordResetToken(id: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE password_reset_tokens SET revoked_at = now() WHERE id = $1`, [id]);
}
