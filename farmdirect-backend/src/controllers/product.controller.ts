import type { Request, Response } from "express";
import * as productService from "../services/product.service";
import * as reviewService from "../services/review.service";
import type { ProductSort } from "../models/product.model";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

const VALID_SORTS: ProductSort[] = ["newest", "price_asc", "price_desc", "rating"];

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const sortParam = typeof req.query.sort === "string" ? req.query.sort : undefined;
  const filters = {
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    farmId: typeof req.query.farm_id === "string" ? req.query.farm_id : undefined,
    sort: (VALID_SORTS as string[]).includes(sortParam ?? "") ? (sortParam as ProductSort) : undefined,
  };
  const { data, total } = await productService.getProductList(filters, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductDetail(req.params.id);
  res.status(200).json({ product });
});

export const getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
  const related = await productService.getRelatedProducts(req.params.id);
  res.status(200).json({ data: related });
});

export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const { data, total } = await productService.getProductReviewsList(req.params.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const addProductReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await reviewService.addProductReview(req.user.id, req.params.id, req.body);
  res.status(201).json({ message: "Review added." });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const product = await productService.createProduct(req.user.id, req.body);
  res.status(201).json({ product });
});

// Mounted behind requireProductOwnership.
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateMyProduct(req.params.id, req.body);
  res.status(200).json({ product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteMyProduct(req.params.id);
  res.status(204).send();
});
