import type { Request, Response } from "express";
import * as farmService from "../services/farm.service";
import * as reviewService from "../services/review.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";
export const listFarms = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const filters = {
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    verifiedOnly: req.query.verified_only === "true",
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  };
  const { data, total } = await farmService.getFarmList(filters, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const getFarm = asyncHandler(async (req: Request, res: Response) => {
  const farm = await farmService.getFarmDetail(req.params.id);
  res.status(200).json({ farm });
});

export const getFarmProducts = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const { data, total } = await farmService.getFarmProducts(req.params.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const getFarmReviews = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const { data, total } = await farmService.getFarmReviews(req.params.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const addFarmReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await reviewService.addFarmReview(req.user.id, req.params.id, req.body);
  res.status(201).json({ message: "Review added." });
});

export const getFarmsNearby = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  const radiusKm = parseFloat(String(req.query.radius_km ?? "10"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw HttpError.badRequest("lat and lng query parameters are required and must be numbers.");
  }
  if (Number.isNaN(radiusKm) || radiusKm <= 0) {
    throw HttpError.badRequest("radius_km must be a positive number.");
  }

  const pagination = parsePagination(req);
  const filters = {
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    verifiedOnly: req.query.verified_only === "true",
  };
  const { data, total } = await farmService.getFarmsNearby(lat, lng, radiusKm, filters, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const getMyFarms = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const farms = await farmService.getMyFarms(req.user.id);
  res.status(200).json({ data: farms });
});

export const createFarm = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const farm = await farmService.createFarm(req.user.id, req.body);
  res.status(201).json({ farm });
});

// Mounted behind requireFarmOwnership, so req.params.id is already confirmed
// to belong to req.user by the time this runs.
export const updateFarm = asyncHandler(async (req: Request, res: Response) => {
  const farm = await farmService.updateMyFarm(req.params.id, req.body);
  res.status(200).json({ farm });
});

export const deleteFarm = asyncHandler(async (req: Request, res: Response) => {
  await farmService.deleteMyFarm(req.params.id);
  res.status(204).send();
});
