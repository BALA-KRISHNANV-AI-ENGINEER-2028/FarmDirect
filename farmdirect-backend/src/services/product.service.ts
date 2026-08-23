import { withTransaction } from "../config/database";
import {
  findProductById,
  insertProduct,
  listProducts,
  listRelatedProducts,
  softDeleteProduct,
  updateProduct,
  type CreateProductInput,
  type ListProductsFilters,
  type ProductRow,
  type UpdateProductInput,
} from "../models/product.model";
import { findFarmOwnerId } from "../models/farm.model";
import { getPrimaryImagesByProductIds, listProductImages } from "../models/productImage.model";
import { listProductReviews } from "../models/productReview.model";
import type { Pagination } from "../utils/pagination";
import { HttpError } from "../utils/httpError";

export function toProductSummary(row: ProductRow, imageUrl?: string) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    unit: row.unit,
    image: imageUrl ?? null,
    farmId: row.farm_id,
    farmName: row.farm_name,
    farmerName: row.farmer_name,
    farmingMethod: row.farming_method,
    harvestDate: row.harvest_date,
    stock: row.stock,
    availability: row.availability,
    rating: Number(row.rating_cached),
    reviewCount: row.review_count_cached,
  };
}

export async function getProductList(filters: ListProductsFilters, pagination: Pagination) {
  const { rows, total } = await listProducts(filters, pagination.limit, pagination.offset);
  const images = await getPrimaryImagesByProductIds(rows.map((r) => r.id));
  return { data: rows.map((r) => toProductSummary(r, images[r.id])), total };
}

export async function getProductDetail(id: string) {
  const product = await findProductById(id);
  if (!product) throw HttpError.notFound("Product not found");

  const [images, reviewsResult] = await Promise.all([
    listProductImages(product.id),
    listProductReviews(product.id, 20, 0),
  ]);

  return {
    ...toProductSummary(product, images[0]?.url),
    images: images.map((i) => i.url),
    description: product.description,
    lowStockThreshold: product.low_stock_threshold,
    reviews: reviewsResult.rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  };
}

export async function getRelatedProducts(id: string, limit = 4) {
  const product = await findProductById(id);
  if (!product) throw HttpError.notFound("Product not found");

  const related = await listRelatedProducts(product.id, product.category, limit);
  const images = await getPrimaryImagesByProductIds(related.map((r) => r.id));
  return related.map((r) => toProductSummary(r, images[r.id]));
}

export async function getProductReviewsList(productId: string, pagination: Pagination) {
  const product = await findProductById(productId);
  if (!product) throw HttpError.notFound("Product not found");

  const { rows, total } = await listProductReviews(productId, pagination.limit, pagination.offset);
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

export async function createProduct(farmerId: string, input: CreateProductInput) {
  // Defense in depth: the route only reaches here after requireRole('farmer'),
  // but farmId comes from the request body (not the URL), so there's no
  // ownership middleware for it — verify here instead.
  const farmOwnerId = await findFarmOwnerId(input.farmId);
  if (!farmOwnerId) throw HttpError.notFound("Farm not found");
  if (farmOwnerId !== farmerId) throw HttpError.forbidden("You don't have permission to add products to this farm.");

  // Transactional since this is now a product insert plus N image inserts —
  // added when image support was (see product.model.ts) — one failing
  // partway shouldn't leave a product with only some of its photos saved.
  const created = await withTransaction((client) => insertProduct(input, client));
  return getProductDetail(created.id);
}

export async function updateMyProduct(productId: string, input: UpdateProductInput) {
  const updated = await withTransaction((client) => updateProduct(productId, input, client));
  if (!updated) throw HttpError.notFound("Product not found");
  return getProductDetail(updated.id);
}

export async function deleteMyProduct(productId: string) {
  await softDeleteProduct(productId);
}
