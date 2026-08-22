import type { Request, Response } from "express";
import * as userService from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const user = await userService.getCurrentUser(req.user.id);
  res.status(200).json({ user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const user = await userService.updateCurrentUser(req.user.id, req.body);
  res.status(200).json({ user });
});
