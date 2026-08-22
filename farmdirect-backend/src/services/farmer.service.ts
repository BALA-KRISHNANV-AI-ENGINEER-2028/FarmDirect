import { findFarmerProfileByUserId } from "../models/farmerProfile.model";
import { listFarmsByFarmerId } from "../models/farm.model";
import { getPrimaryImagesByFarmIds } from "../models/farmImage.model";
import { listFarmerReviews } from "../models/farmerReview.model";
import { listProducts } from "../models/product.model";
import { getPrimaryImagesByProductIds } from "../models/productImage.model";
import type { Pagination } from "../utils/pagination";
import { HttpError } from "../utils/httpError";
import { toProductSummary } from "./product.service";

export async function getFarmerPublicProfile(farmerId: string) {
  const farmer = await findFarmerProfileByUserId(farmerId);
  if (!farmer) throw HttpError.notFound("Farmer not found");

  const farms = await listFarmsByFarmerId(farmerId);
  const images = await getPrimaryImagesByFarmIds(farms.map((f) => f.id));

  return {
    id: farmer.user_id,
    fullName: farmer.full_name,
    avatarUrl: farmer.avatar_url,
    experienceYears: farmer.experience_years,
    verified: farmer.verified,
    story: farmer.story,
    rating: Number(farmer.rating_cached),
    reviewCount: farmer.review_count_cached,
    farms: farms.map((f) => ({
      id: f.id,
      name: f.name,
      image: images[f.id] ?? null,
      addressLine: f.address_line,
      verified: f.verified,
    })),
  };
}

/** Products across every farm this farmer owns — matches the public FarmerProfile page. */
export async function getFarmerProducts(farmerId: string, pagination: Pagination) {
  const farmer = await findFarmerProfileByUserId(farmerId);
  if (!farmer) throw HttpError.notFound("Farmer not found");

  const farms = await listFarmsByFarmerId(farmerId);
  if (farms.length === 0) return { data: [], total: 0 };

  // No multi-farm filter in the product model yet (only a single farmId) —
  // Phase D keeps this simple by querying per-farm and merging, since a
  // farmer typically owns a small number of farms. Revisit with an
  // IN-clause filter if this becomes a hot path with many farms per farmer.
  const results = await Promise.all(
    farms.map((f) => listProducts({ farmId: f.id }, pagination.limit, pagination.offset))
  );
  const rows = results.flatMap((r) => r.rows);
  const total = results.reduce((sum, r) => sum + r.total, 0);
  const images = await getPrimaryImagesByProductIds(rows.map((r) => r.id));

  return { data: rows.map((r) => toProductSummary(r, images[r.id])), total };
}

export async function getFarmerReviews(farmerId: string, pagination: Pagination) {
  const farmer = await findFarmerProfileByUserId(farmerId);
  if (!farmer) throw HttpError.notFound("Farmer not found");

  const { rows, total } = await listFarmerReviews(farmerId, pagination.limit, pagination.offset);
  return {
    data: rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
    total,
  };
}
