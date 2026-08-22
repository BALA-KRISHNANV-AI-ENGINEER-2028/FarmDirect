import { addProductFavorite, listFavoriteProductIds, removeProductFavorite } from "../models/productFavorite.model";
import { addFarmFavorite, listFavoriteFarmIds, removeFarmFavorite } from "../models/farmFavorite.model";
import { addFarmerFavorite, listFavoriteFarmerIds, removeFarmerFavorite } from "../models/farmerFavorite.model";
import { findProductById } from "../models/product.model";
import { findFarmById } from "../models/farm.model";
import { findFarmerProfileByUserId } from "../models/farmerProfile.model";
import { getPrimaryImagesByProductIds } from "../models/productImage.model";
import { getPrimaryImagesByFarmIds } from "../models/farmImage.model";
import { toProductSummary } from "./product.service";
import { HttpError } from "../utils/httpError";

/**
 * Matches the tabbed Favorites page in the frontend: one response with all
 * three kinds, shaped the same way the corresponding list/detail endpoints
 * already shape them, so the frontend can reuse ProductCard/FarmCard as-is.
 */
export async function getFavorites(customerId: string) {
  const [productIds, farmIds, farmerIds] = await Promise.all([
    listFavoriteProductIds(customerId),
    listFavoriteFarmIds(customerId),
    listFavoriteFarmerIds(customerId),
  ]);

  const [products, farmImages, farmers] = await Promise.all([
    Promise.all(productIds.map((id) => findProductById(id))),
    getPrimaryImagesByFarmIds(farmIds),
    Promise.all(farmerIds.map((id) => findFarmerProfileByUserId(id))),
  ]);

  const farms = await Promise.all(farmIds.map((id) => findFarmById(id)));
  const productImages = await getPrimaryImagesByProductIds(productIds);

  return {
    products: products
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => toProductSummary(p, productImages[p.id])),
    farms: farms
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => ({ id: f.id, name: f.name, image: farmImages[f.id] ?? null, addressLine: f.address_line, verified: f.verified })),
    farmers: farmers
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => ({ id: f.user_id, fullName: f.full_name, avatarUrl: f.avatar_url, verified: f.verified })),
  };
}

export async function toggleProductFavorite(customerId: string, productId: string, favorited: boolean) {
  if (favorited) {
    const product = await findProductById(productId);
    if (!product) throw HttpError.notFound("Product not found");
    await addProductFavorite(customerId, productId);
  } else {
    await removeProductFavorite(customerId, productId);
  }
}

export async function toggleFarmFavorite(customerId: string, farmId: string, favorited: boolean) {
  if (favorited) {
    const farm = await findFarmById(farmId);
    if (!farm) throw HttpError.notFound("Farm not found");
    await addFarmFavorite(customerId, farmId);
  } else {
    await removeFarmFavorite(customerId, farmId);
  }
}

export async function toggleFarmerFavorite(customerId: string, farmerId: string, favorited: boolean) {
  if (favorited) {
    const farmer = await findFarmerProfileByUserId(farmerId);
    if (!farmer) throw HttpError.notFound("Farmer not found");
    await addFarmerFavorite(customerId, farmerId);
  } else {
    await removeFarmerFavorite(customerId, farmerId);
  }
}
