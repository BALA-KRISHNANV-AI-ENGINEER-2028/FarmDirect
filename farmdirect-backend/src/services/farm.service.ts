import {
  findFarmById,
  insertFarm,
  listFarms,
  listFarmsByFarmerId,
  listFarmsNearby,
  softDeleteFarm,
  updateFarm,
  type CreateFarmInput,
  type FarmRow,
  type ListFarmsFilters,
  type NearbyFarmsFilters,
  type UpdateFarmInput,
} from "../models/farm.model";
import { getPrimaryImagesByFarmIds, listFarmImages } from "../models/farmImage.model";
import { listFarmReviews } from "../models/farmReview.model";
import { listProducts } from "../models/product.model";
import { getPrimaryImagesByProductIds } from "../models/productImage.model";
import type { Pagination } from "../utils/pagination";
import { HttpError } from "../utils/httpError";
import { toProductSummary } from "./product.service";

function toFarmSummary(row: FarmRow, imageUrl?: string) {
  return {
    id: row.id,
    name: row.name,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    image: imageUrl ?? null,
    category: row.category,
    farmingMethod: row.farming_method,
    sizeAcres: row.size_acres ? Number(row.size_acres) : null,
    yearsActive: row.years_active,
    verified: row.verified,
    addressLine: row.address_line,
    rating: Number(row.rating_cached),
    reviewCount: row.review_count_cached,
  };
}

export async function getFarmList(filters: ListFarmsFilters, pagination: Pagination) {
  const { rows, total } = await listFarms(filters, pagination.limit, pagination.offset);
  const images = await getPrimaryImagesByFarmIds(rows.map((r) => r.id));
  return { data: rows.map((r) => toFarmSummary(r, images[r.id])), total };
}

export async function getFarmDetail(id: string) {
  const farm = await findFarmById(id);
  if (!farm) throw HttpError.notFound("Farm not found");

  const gallery = await listFarmImages(farm.id);

  return {
    ...toFarmSummary(farm, gallery[0]?.url),
    description: farm.description,
    gallery: gallery.map((g) => g.url),
  };
}

export async function getFarmProducts(farmId: string, pagination: Pagination) {
  const farm = await findFarmById(farmId);
  if (!farm) throw HttpError.notFound("Farm not found");

  const { rows, total } = await listProducts({ farmId }, pagination.limit, pagination.offset);
  const images = await getPrimaryImagesByProductIds(rows.map((r) => r.id));
  return { data: rows.map((r) => toProductSummary(r, images[r.id])), total };
}

export async function getFarmReviews(farmId: string, pagination: Pagination) {
  const farm = await findFarmById(farmId);
  if (!farm) throw HttpError.notFound("Farm not found");

  const { rows, total } = await listFarmReviews(farmId, pagination.limit, pagination.offset);
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

export async function getMyFarms(farmerId: string) {
  const rows = await listFarmsByFarmerId(farmerId);
  const images = await getPrimaryImagesByFarmIds(rows.map((r) => r.id));
  return rows.map((r) => toFarmSummary(r, images[r.id]));
}

export async function getFarmsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  filters: NearbyFarmsFilters,
  pagination: Pagination
) {
  const { rows, total } = await listFarmsNearby(lat, lng, radiusKm, filters, pagination.limit, pagination.offset);
  const images = await getPrimaryImagesByFarmIds(rows.map((r) => r.id));
  return {
    data: rows.map((r) => ({ ...toFarmSummary(r, images[r.id]), distanceKm: Number(r.distance_km) })),
    total,
  };
}

export async function createFarm(farmerId: string, input: Omit<CreateFarmInput, "farmerId">) {
  const created = await insertFarm({ ...input, farmerId });
  // insertFarm doesn't join farmer_profiles — re-fetch for a complete DTO.
  return getFarmDetail(created.id);
}

export async function updateMyFarm(farmId: string, input: UpdateFarmInput) {
  const updated = await updateFarm(farmId, input);
  if (!updated) throw HttpError.notFound("Farm not found");
  return getFarmDetail(updated.id);
}

export async function deleteMyFarm(farmId: string) {
  await softDeleteFarm(farmId);
}
