import type { Request, Response } from "express";
import * as farmerService from "../services/farmer.service";
import * as reviewService from "../services/review.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export const getFarmerProfile = asyncHandler(async (req: Request, res: Response) => {
  const farmer = await farmerService.getFarmerPublicProfile(req.params.id);
  res.status(200).json({ farmer });
});

export const getFarmerProducts = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const { data, total } = await farmerService.getFarmerProducts(req.params.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const getFarmerReviews = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const { data, total } = await farmerService.getFarmerReviews(req.params.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const addFarmerReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await reviewService.addFarmerReview(req.user.id, req.params.id, req.body);
  res.status(201).json({ message: "Review added." });
});
