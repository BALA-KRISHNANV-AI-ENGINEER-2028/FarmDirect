import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../models/user.model";
import { HttpError } from "../utils/httpError";

/** Mount after requireAuth. Rejects with 403 if the user's role isn't in the allowed list. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw HttpError.unauthorized("Authentication required.");
    }
    if (!roles.includes(req.user.role)) {
      throw HttpError.forbidden("You don't have permission to perform this action.");
    }
    next();
  };
}
