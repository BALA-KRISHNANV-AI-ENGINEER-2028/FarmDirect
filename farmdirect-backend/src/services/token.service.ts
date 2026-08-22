import { randomBytes, createHash } from "crypto";
import type { PoolClient } from "pg";
import { env } from "../config/env";
import {
  findActiveRefreshTokenByHash,
  insertRefreshToken,
  revokeRefreshTokenById,
} from "../models/refreshToken.model";

/**
 * Opaque refresh tokens (decision #5) — not JWTs. A random 48-byte value,
 * hex-encoded, hashed with sha256 before it ever touches the database. The
 * raw value is only ever held by the client, inside an httpOnly cookie.
 */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function refreshTokenExpiry(): Date {
  const days = env.JWT_REFRESH_EXPIRES_IN_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Issues a brand new refresh token for a user (registration, login). */
export async function issueRefreshToken(userId: string, client?: PoolClient): Promise<string> {
  const rawToken = generateOpaqueToken();
  await insertRefreshToken(
    { userId, tokenHash: hashToken(rawToken), expiresAt: refreshTokenExpiry() },
    client
  );
  return rawToken;
}

/**
 * Rotation-on-use: looks up the presented token, and if it's valid, revokes
 * it and issues a new one in its place. Returns null if the presented token
 * isn't valid (expired, already revoked, or unknown) — callers should treat
 * that as "not authenticated" rather than a specific error, so a stolen/
 * replayed token doesn't get diagnostic detail back.
 */
export async function rotateRefreshToken(
  rawToken: string,
  client?: PoolClient
): Promise<{ userId: string; newRawToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const existing = await findActiveRefreshTokenByHash(tokenHash, client);
  if (!existing) return null;

  await revokeRefreshTokenById(existing.id, client);
  const newRawToken = await issueRefreshToken(existing.user_id, client);
  return { userId: existing.user_id, newRawToken };
}

/** Logout: revoke the presented token if it's still valid. No-op if it isn't. */
export async function revokeRefreshTokenIfValid(rawToken: string, client?: PoolClient): Promise<void> {
  const existing = await findActiveRefreshTokenByHash(hashToken(rawToken), client);
  if (existing) {
    await revokeRefreshTokenById(existing.id, client);
  }
}
