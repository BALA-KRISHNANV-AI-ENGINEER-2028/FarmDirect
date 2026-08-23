import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

/**
 * Last middleware in the chain. Never leaks stack traces or raw DB errors to
 * the client in production — logs the full detail server-side, sends a clean
 * shape to the client either way.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error-handling middleware by arity (4 params) — this
  // parameter must stay even though it's unused, or Express treats this as a
  // normal middleware and error handling breaks.
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(`[${req.method} ${req.originalUrl}]`, err);
    }
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[${req.method} ${req.originalUrl}] Unhandled error:`, {
    name: err instanceof Error ? err.name : "Error",
    message: err instanceof Error ? err.message : String(err),
    code: (err as Record<string, unknown>)?.code,
    detail: (err as Record<string, unknown>)?.detail,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    error: {
      message:
        env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err instanceof Error
            ? err.message
            : "Unknown error",
    },
  });
}

/** Mounted after all routes — turns unmatched paths into a clean 404. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.originalUrl}` } });
}
