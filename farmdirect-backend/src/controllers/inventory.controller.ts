import type { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const inventory = await inventoryService.getInventory(req.user.id);
  res.status(200).json({ data: inventory });
});

export const getProductMovements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const pagination = parsePagination(req);
  const { data, total } = await inventoryService.getProductMovementHistory(
    req.user.id,
    req.params.productId,
    pagination
  );
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const adjustInventory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const result = await inventoryService.adjustInventory(req.user.id, req.params.productId, req.body);
  res.status(200).json({ data: result });
});
