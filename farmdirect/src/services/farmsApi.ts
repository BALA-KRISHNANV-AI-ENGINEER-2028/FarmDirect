import { api } from "./apiClient";
import type { Farm } from "../types";

interface ApiFarmSummary {
  id: string;
  name: string;
  farmerId: string;
  farmerName: string;
  image: string | null;
  category: string | null;
  farmingMethod: string | null;
  sizeAcres: number | null;
  yearsActive: number | null;
  verified: boolean;
  addressLine: string | null;
  rating: number;
  reviewCount: number;
  distanceKm?: number;
}

interface ApiFarmDetail extends ApiFarmSummary {
  description: string | null;
  gallery: string[];
}

/**
 * Maps onto the frontend's existing `Farm` type. `currentCrops` isn't part
 * of the approved schema (no such column on `farms`), so it's always an
 * empty array here — the Current Crops section on FarmDetail.tsx will
 * render empty until that's added to a future migration; not something
 * Phase H can add on its own since it wasn't in the reviewed architecture.
 * `lat`/`lng` aren't exposed by the farm detail API (only distanceKm on
 * the nearby-search response), so they default to 0 — nothing in the UI
 * reads them directly except the (already-mock) map preview.
 */
function toFarm(dto: ApiFarmSummary | ApiFarmDetail): Farm {
  const detail = "gallery" in dto ? dto : null;
  return {
    id: dto.id,
    name: dto.name,
    farmerId: dto.farmerId,
    image: dto.image ?? "",
    gallery: detail?.gallery ?? (dto.image ? [dto.image] : []),
    location: dto.addressLine ?? "",
    distanceMi: dto.distanceKm ?? 0,
    lat: 0,
    lng: 0,
    sizeAcres: dto.sizeAcres ?? 0,
    farmingMethod: (dto.farmingMethod ?? "Conventional") as Farm["farmingMethod"],
    yearsActive: dto.yearsActive ?? 0,
    verified: dto.verified,
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    currentCrops: [],
    category: (dto.category ?? "Vegetables") as Farm["category"],
    description: detail?.description ?? "",
  };
}

function buildQuery<T extends object>(params: T): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export interface FarmListParams {
  category?: string;
  verified_only?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchFarms(params: FarmListParams = {}) {
  const res = await api.get<{ data: ApiFarmSummary[]; meta: { total: number } }>(`/farms${buildQuery(params)}`);
  return { farms: res.data.map(toFarm), total: res.meta.total };
}

export async function fetchFarm(id: string): Promise<Farm> {
  const res = await api.get<{ farm: ApiFarmDetail }>(`/farms/${id}`);
  return toFarm(res.farm);
}

export interface NearbyFarmsParams {
  lat: number;
  lng: number;
  radius_km?: number;
  category?: string;
  verified_only?: boolean;
}

export async function fetchNearbyFarms(params: NearbyFarmsParams) {
  const res = await api.get<{ data: ApiFarmSummary[]; meta: { total: number } }>(`/farms/nearby${buildQuery(params)}`);
  return { farms: res.data.map(toFarm), total: res.meta.total };
}

export async function fetchMyFarms(): Promise<Farm[]> {
  const res = await api.get<{ data: ApiFarmSummary[] }>("/farms/mine");
  return res.data.map(toFarm);
}

export interface CreateFarmInput {
  name: string;
  description?: string;
  category?: string;
  sizeAcres?: number;
  farmingMethod?: string;
  yearsActive?: number;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
}

export async function createFarm(input: CreateFarmInput): Promise<Farm> {
  const res = await api.post<{ farm: ApiFarmDetail }>("/farms", input);
  return toFarm(res.farm);
}

export async function updateFarm(id: string, input: Partial<CreateFarmInput>): Promise<Farm> {
  const res = await api.put<{ farm: ApiFarmDetail }>(`/farms/${id}`, input);
  return toFarm(res.farm);
}

export async function deleteFarm(id: string): Promise<void> {
  await api.delete(`/farms/${id}`);
}
