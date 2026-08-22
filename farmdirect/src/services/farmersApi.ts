import { api } from "./apiClient";
import type { Farmer } from "../types";

interface ApiFarmerProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  experienceYears: number | null;
  verified: boolean;
  story: string | null;
  rating: number;
  reviewCount: number;
  farms: { id: string; name: string; image: string | null; addressLine: string | null; verified: boolean }[];
}

/**
 * Maps onto the frontend's existing `Farmer` type, which was designed
 * around one farm per farmer (`farmId`/`farmName`) before decision #3
 * allowed many. Takes the first farm for those two fields — acceptable for
 * the existing UI (FarmerProfile.tsx links to "the farm"), but a farmer
 * with multiple farms will only surface their first one through this
 * particular type; `productIds` is left empty since the frontend's
 * FarmerProfile page fetches products via a separate call, not this field.
 */
function toFarmer(dto: ApiFarmerProfile): Farmer {
  const firstFarm = dto.farms[0];
  return {
    id: dto.id,
    name: dto.fullName,
    photo: dto.avatarUrl ?? "",
    farmId: firstFarm?.id ?? "",
    farmName: firstFarm?.name ?? "",
    experienceYears: dto.experienceYears ?? 0,
    location: firstFarm?.addressLine ?? "",
    verified: dto.verified,
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    story: dto.story ?? "",
    productIds: [],
  };
}

export async function fetchFarmer(id: string): Promise<Farmer> {
  const res = await api.get<{ farmer: ApiFarmerProfile }>(`/farmers/${id}`);
  return toFarmer(res.farmer);
}
