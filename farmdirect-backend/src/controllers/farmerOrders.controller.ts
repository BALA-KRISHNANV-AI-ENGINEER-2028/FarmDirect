import type { Request, Response } from "express";
import * as orderService from "../services/order.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export const listFarmerOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const pagination = parsePagination(req);
  const { data, total } = await orderService.listFarmerOrders(req.user.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});
