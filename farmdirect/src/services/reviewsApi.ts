import { api } from "./apiClient";

export async function addProductReview(productId: string, rating: number, comment?: string) {
  await api.post(`/products/${productId}/reviews`, { rating, comment });
}
export async function addFarmReview(farmId: string, rating: number, comment?: string) {
  await api.post(`/farms/${farmId}/reviews`, { rating, comment });
}
export async function addFarmerReview(farmerId: string, rating: number, comment?: string) {
  await api.post(`/farmers/${farmerId}/reviews`, { rating, comment });
}
