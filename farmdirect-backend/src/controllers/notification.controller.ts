import type { Request, Response } from "express";
import * as notificationService from "../services/notification.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const pagination = parsePagination(req);
  const { data, total } = await notificationService.getMyNotifications(req.user.id, pagination);
  res.status(200).json(paginatedResponse(data, total, pagination));
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const preferences = await notificationService.updateMyPreferences(req.user.id, req.body);
  res.status(200).json({ preferences });
});
