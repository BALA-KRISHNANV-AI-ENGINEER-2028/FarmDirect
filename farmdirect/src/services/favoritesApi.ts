import { api } from "./apiClient";
import type { Product } from "../types";
import { fetchProduct as fetchProductDetail } from "./productsApi";

export interface ApiFavorites {
  products: {
    id: string;
    name: string;
    category: string | null;
    price: number;
    unit: string;
    image: string | null;
    farmId: string;
    farmName: string;
    farmerName: string;
    farmingMethod: string | null;
    harvestDate: string | null;
    stock: number;
    availability: string;
    rating: number;
    reviewCount: number;
  }[];
  farms: { id: string; name: string; image: string | null; addressLine: string | null; verified: boolean }[];
  farmers: { id: string; fullName: string; avatarUrl: string | null; verified: boolean }[];
}

export async function fetchFavorites(): Promise<ApiFavorites> {
  return api.get<ApiFavorites>("/favorites");
}

export async function favoriteProduct(id: string): Promise<void> {
  await api.post(`/favorites/products/${id}`);
}
export async function unfavoriteProduct(id: string): Promise<void> {
  await api.delete(`/favorites/products/${id}`);
}
export async function favoriteFarm(id: string): Promise<void> {
  await api.post(`/favorites/farms/${id}`);
}
export async function unfavoriteFarm(id: string): Promise<void> {
  await api.delete(`/favorites/farms/${id}`);
}
export async function favoriteFarmer(id: string): Promise<void> {
  await api.post(`/favorites/farmers/${id}`);
}
export async function unfavoriteFarmer(id: string): Promise<void> {
  await api.delete(`/favorites/farmers/${id}`);
}

/** Re-fetches full product detail (with images[]/reviews[]) for each favorited product id, for pages that need the full Product shape rather than the favorites summary. */
export async function fetchFavoriteProductDetails(productIds: string[]): Promise<Product[]> {
  return Promise.all(productIds.map((id) => fetchProductDetail(id)));
}
