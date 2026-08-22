import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Verifies the `Authorization: Bearer <token>` access token and attaches
 * `req.user`. Does not touch the database — access tokens are self-
 * contained JWTs, that's the point of the short-lived-access/rotating-
 * refresh split (decision #5).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw HttpError.unauthorized("Missing or malformed Authorization header.");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw HttpError.unauthorized("Invalid or expired access token.");
  }
}
