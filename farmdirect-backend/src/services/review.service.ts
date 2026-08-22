import { withTransaction } from "../config/database";
import { findProductById, recomputeProductRatingCache } from "../models/product.model";
import { findFarmById, recomputeFarmRatingCache } from "../models/farm.model";
import { findFarmerProfileByUserId, recomputeFarmerRatingCache } from "../models/farmerProfile.model";
import { insertProductReview } from "../models/productReview.model";
import { insertFarmReview } from "../models/farmReview.model";
import { insertFarmerReview } from "../models/farmerReview.model";
import { HttpError } from "../utils/httpError";

export interface AddReviewInput {
  rating: number;
  comment?: string;
}

/** Every add*Review function follows the same shape: verify target exists,
 * insert (catching the unique-violation for "already reviewed this" as a
 * clean 409 rather than a raw DB error — same pattern as the Phase E stock
 * guard and the Phase F order-number retry), recompute the cached
 * rating/count on the target in the same transaction. */

export async function addProductReview(customerId: string, productId: string, input: AddReviewInput) {
  const product = await findProductById(productId);
  if (!product) throw HttpError.notFound("Product not found");

  await withTransaction(async (client) => {
    try {
      await insertProductReview({ customerId, productId, rating: input.rating, comment: input.comment }, client);
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") throw HttpError.conflict("You've already reviewed this product.");
      throw err;
    }
    await recomputeProductRatingCache(productId, client);
  });
}

export async function addFarmReview(customerId: string, farmId: string, input: AddReviewInput) {
  const farm = await findFarmById(farmId);
  if (!farm) throw HttpError.notFound("Farm not found");

  await withTransaction(async (client) => {
    try {
      await insertFarmReview({ customerId, farmId, rating: input.rating, comment: input.comment }, client);
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") throw HttpError.conflict("You've already reviewed this farm.");
      throw err;
    }
    await recomputeFarmRatingCache(farmId, client);
  });
}

export async function addFarmerReview(customerId: string, farmerId: string, input: AddReviewInput) {
  const farmer = await findFarmerProfileByUserId(farmerId);
  if (!farmer) throw HttpError.notFound("Farmer not found");

  await withTransaction(async (client) => {
    try {
      await insertFarmerReview({ customerId, farmerId, rating: input.rating, comment: input.comment }, client);
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") throw HttpError.conflict("You've already reviewed this farmer.");
      throw err;
    }
    await recomputeFarmerRatingCache(farmerId, client);
  });
}
