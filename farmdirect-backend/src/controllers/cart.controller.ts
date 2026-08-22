import type { Request, Response } from "express";
import * as cartService from "../services/cart.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const cart = await cartService.getCart(req.user.id);
  res.status(200).json(cart);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const cart = await cartService.addToCart(req.user.id, req.body.productId, req.body.quantity);
  res.status(201).json(cart);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const cart = await cartService.updateCartItemQuantity(req.user.id, req.params.productId, req.body.quantity);
  res.status(200).json(cart);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const cart = await cartService.removeFromCart(req.user.id, req.params.productId);
  res.status(200).json(cart);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  await cartService.clearCart(req.user.id);
  res.status(204).send();
});
