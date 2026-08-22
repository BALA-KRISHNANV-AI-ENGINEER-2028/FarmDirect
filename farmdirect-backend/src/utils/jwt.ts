import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/user.model";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
}

/**
 * Access tokens are short-lived JWTs (decision #5) — signed with
 * JWT_ACCESS_SECRET, never persisted server-side. The frontend is expected
 * to hold this in memory only (not localStorage) and send it as
 * `Authorization: Bearer <token>`.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === "string" || !("sub" in decoded) || !("role" in decoded)) {
    throw new Error("Malformed access token payload");
  }
  return { sub: decoded.sub as string, role: decoded.role as UserRole };
}
