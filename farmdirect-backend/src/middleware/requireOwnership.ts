import type { NextFunction, Request, Response } from "express";
import { findFarmOwnerId } from "../models/farm.model";
import { findProductOwnerId } from "../models/product.model";
import { findAddressOwnerId } from "../models/address.model";
import { HttpError } from "../utils/httpError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Mount after requireAuth + requireRole('farmer'). Checks that req.params.id
 * refers to a farm owned by the authenticated farmer.
 *
 * Distinguishes "doesn't exist" (404) from "exists but isn't yours" (403) —
 * per the architecture doc's auth-flow note, this is a deliberate choice:
 * an authenticated farmer probing farm ids gets a 403 (confirms the farm
 * exists, just isn't theirs) rather than a 404 that would be indistinguishable
 * from a typo. Worth revisiting if farm ids should be treated as sensitive
 * enough to hide existence from other farmers entirely.
 */
export const requireFarmOwnership = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw HttpError.unauthorized();
  const ownerId = await findFarmOwnerId(req.params.id);
  if (!ownerId) throw HttpError.notFound("Farm not found");
  if (ownerId !== req.user.id) throw HttpError.forbidden("You don't have permission to modify this farm.");
  next();
});

/** Same pattern as requireFarmOwnership, for req.params.id referring to a product. */
export const requireProductOwnership = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw HttpError.unauthorized();
  const ownerId = await findProductOwnerId(req.params.id);
  if (!ownerId) throw HttpError.notFound("Product not found");
  if (ownerId !== req.user.id) throw HttpError.forbidden("You don't have permission to modify this product.");
  next();
});

/** Same pattern, for req.params.id referring to a customer's own address. */
export const requireAddressOwnership = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw HttpError.unauthorized();
  const ownerId = await findAddressOwnerId(req.params.id);
  if (!ownerId) throw HttpError.notFound("Address not found");
  if (ownerId !== req.user.id) throw HttpError.forbidden("You don't have permission to modify this address.");
  next();
});
