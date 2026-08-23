import type { Request, Response } from "express";
import * as favoriteService from "../services/favorite.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";

export const getFavorites = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const favorites = await favoriteService.getFavorites(req.user.id);
  res.status(200).json(favorites);
});

export const addProductFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleProductFavorite(req.user.id, req.params.id, true);
  res.status(201).json({ message: "Added to favorites." });
});

export const removeProductFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleProductFavorite(req.user.id, req.params.id, false);
  res.status(204).send();
});

export const addFarmFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleFarmFavorite(req.user.id, req.params.id, true);
  res.status(201).json({ message: "Added to favorites." });
});

export const removeFarmFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleFarmFavorite(req.user.id, req.params.id, false);
  res.status(204).send();
});

export const addFarmerFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleFarmerFavorite(req.user.id, req.params.id, true);
  res.status(201).json({ message: "Added to favorites." });
});

export const removeFarmerFavorite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await favoriteService.toggleFarmerFavorite(req.user.id, req.params.id, false);
  res.status(204).send();
});
