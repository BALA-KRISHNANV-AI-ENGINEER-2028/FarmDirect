import type { Request, Response } from "express";
import * as orderService from "../services/order.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const order = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json({ order });
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const pagination = parsePagination(req);
  const { data, total } = await orderService.listMyOrders(req.user.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

// Accessible by the owning customer OR a farmer with an item on the order —
// role-branch handled inside the service, not by route-level requireRole.
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const order = await orderService.getOrderDetail(req.params.id, req.user);
  res.status(200).json({ order });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const order = await orderService.updateOrderStatus(req.user.id, req.params.id, req.body.status, req.body.note);
  res.status(200).json({ order });
});
