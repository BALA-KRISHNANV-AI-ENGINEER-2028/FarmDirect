import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError";

/**
 * Validates req.body against a zod schema before it reaches the controller.
 * Replaces req.body with the parsed (and type-coerced) result, so
 * controllers can trust the shape without re-checking it.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw HttpError.badRequest("Invalid request body.", result.error.flatten().fieldErrors);
    }
    req.body = result.data;
    next();
  };
}
