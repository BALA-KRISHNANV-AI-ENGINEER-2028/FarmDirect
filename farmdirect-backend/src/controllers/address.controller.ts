import type { Request, Response } from "express";
import * as addressService from "../services/address.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";

export const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const addresses = await addressService.listMyAddresses(req.user.id);
  res.status(200).json({ data: addresses });
});

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const address = await addressService.createAddress(req.user.id, req.body);
  res.status(201).json({ address });
});

// Mounted behind requireAddressOwnership.
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw HttpError.unauthorized();
  const address = await addressService.updateMyAddress(req.user.id, req.params.id, req.body);
  res.status(200).json({ address });
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await addressService.deleteMyAddress(req.params.id);
  res.status(204).send();
});
