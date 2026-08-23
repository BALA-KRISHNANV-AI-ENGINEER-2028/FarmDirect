import { Router } from "express";
import * as addressController from "../controllers/address.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { requireAddressOwnership } from "../middleware/requireOwnership";
import { validateBody } from "../middleware/validate";
import { createAddressSchema, updateAddressSchema } from "../validation/address.schemas";

export const addressRouter = Router();

addressRouter.use(requireAuth, requireRole("customer"));

addressRouter.get("/", addressController.listAddresses);
addressRouter.post("/", validateBody(createAddressSchema), addressController.createAddress);
addressRouter.put("/:id", requireAddressOwnership, validateBody(updateAddressSchema), addressController.updateAddress);
addressRouter.delete("/:id", requireAddressOwnership, addressController.deleteAddress);
