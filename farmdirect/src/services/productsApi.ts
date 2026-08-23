import { api } from "./apiClient";
import type { Product, Review } from "../types";

interface ApiProductSummary {
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
}

interface ApiProductDetail extends ApiProductSummary {
  images: string[];
  description: string | null;
  reviews: { id: string; customerName: string; rating: number; comment: string | null; createdAt: string }[];
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

/**
 * Maps the API's product shape onto the frontend's existing `Product` type
 * so ProductCard/ProductDetail/etc. need no changes. A few fields the
 * backend doesn't (yet) provide per product get sensible defaults:
 *   - distanceMi: no per-product geo query exists (only farms/nearby does),
 *     defaulted to 0 rather than inventing a value.
 *   - farmerId: the product API doesn't expose it (only farmerName); not
 *     used for navigation anywhere in the UI, so left blank.
 */
function toProduct(dto: ApiProductSummary | ApiProductDetail): Product {
  const detail = "images" in dto ? dto : null;
  return {
    id: dto.id,
    name: dto.name,
    category: (dto.category ?? "Vegetables") as Product["category"],
    price: dto.price,
    unit: dto.unit,
    images: detail?.images?.length ? detail.images : dto.image ? [dto.image] : [],
    farmId: dto.farmId,
    farmerId: "",
    farmName: dto.farmName,
    farmerName: dto.farmerName,
    distanceMi: 0,
    harvestDate: dto.harvestDate ?? "",
    farmingMethod: (dto.farmingMethod ?? "Conventional") as Product["farmingMethod"],
    stock: dto.stock,
    availability: dto.availability as Product["availability"],
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    description: detail?.description ?? "",
    harvestedToday: isToday(dto.harvestDate),
    reviews: (detail?.reviews ?? []).map(
      (r): Review => ({ id: r.id, author: r.customerName, rating: r.rating, date: r.createdAt, comment: r.comment ?? "" })
    ),
  };
}

export interface ProductListParams {
  category?: string;
  search?: string;
  farmId?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  limit?: number;
}

function buildQuery<T extends object>(params: T): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchProducts(params: ProductListParams = {}) {
  const res = await api.get<{ data: ApiProductSummary[]; meta: { total: number } }>(
    `/products${buildQuery(params)}`
  );
  return { products: res.data.map(toProduct), total: res.meta.total };
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await api.get<{ product: ApiProductDetail }>(`/products/${id}`);
  return toProduct(res.product);
}

export async function fetchRelatedProducts(id: string): Promise<Product[]> {
  const res = await api.get<{ data: ApiProductSummary[] }>(`/products/${id}/related`);
  return res.data.map(toProduct);
}

export interface CreateProductInput {
  farmId: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  unit: string;
  farmingMethod?: string;
  harvestDate?: string;
  stock: number;
  lowStockThreshold?: number;
  images?: string[];
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const res = await api.post<{ product: ApiProductDetail }>("/products", input);
  return toProduct(res.product);
}

export async function updateProduct(id: string, input: Partial<Omit<CreateProductInput, "farmId" | "stock">>) {
  const res = await api.put<{ product: ApiProductDetail }>(`/products/${id}`, input);
  return toProduct(res.product);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
