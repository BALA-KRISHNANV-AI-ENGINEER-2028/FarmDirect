import { api } from "./apiClient";

export interface ApiCartItem {
  productId: string;
  name: string;
  image: string | null;
  price: number;
  unit: string;
  quantity: number;
  farmId: string;
  farmName: string;
  availability: string;
  stock: number;
}

export interface ApiCart {
  items: ApiCartItem[];
  subtotal: number;
  totalItems: number;
}

export async function fetchCart(): Promise<ApiCart> {
  return api.get<ApiCart>("/cart");
}

export async function addCartItem(productId: string, quantity = 1): Promise<ApiCart> {
  return api.post<ApiCart>("/cart/items", { productId, quantity });
}

export async function updateCartItem(productId: string, quantity: number): Promise<ApiCart> {
  return api.put<ApiCart>(`/cart/items/${productId}`, { quantity });
}

export async function removeCartItem(productId: string): Promise<ApiCart> {
  return api.delete<ApiCart>(`/cart/items/${productId}`);
}

export async function clearCartApi(): Promise<void> {
  await api.delete("/cart");
}
