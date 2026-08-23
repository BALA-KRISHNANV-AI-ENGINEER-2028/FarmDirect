import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validateBody } from "../middleware/validate";
import { adjustInventorySchema } from "../validation/inventory.schemas";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireRole("farmer"));

inventoryRouter.get("/", inventoryController.getInventory);
inventoryRouter.get("/:productId/movements", inventoryController.getProductMovements);
inventoryRouter.post(
  "/:productId/adjust",
  validateBody(adjustInventorySchema),
  inventoryController.adjustInventory
);
