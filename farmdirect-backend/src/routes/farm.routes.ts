import { Router } from "express";
import * as farmController from "../controllers/farm.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { requireFarmOwnership } from "../middleware/requireOwnership";
import { validateBody } from "../middleware/validate";
import { createFarmSchema, updateFarmSchema } from "../validation/farm.schemas";
import { addReviewSchema } from "../validation/review.schemas";

export const farmRouter = Router();

// NOTE: "/mine" and "/nearby" must be registered before "/:id" or Express
// will treat them as a farm id.
farmRouter.get("/mine", requireAuth, requireRole("farmer"), farmController.getMyFarms);
farmRouter.get("/nearby", farmController.getFarmsNearby);

farmRouter.get("/", farmController.listFarms);

farmRouter.post(
  "/",
  requireAuth,
  requireRole("farmer"),
  validateBody(createFarmSchema),
  farmController.createFarm
);

farmRouter.get("/:id", farmController.getFarm);
farmRouter.get("/:id/products", farmController.getFarmProducts);
farmRouter.get("/:id/reviews", farmController.getFarmReviews);
farmRouter.post(
  "/:id/reviews",
  requireAuth,
  requireRole("customer"),
  validateBody(addReviewSchema),
  farmController.addFarmReview
);

farmRouter.put(
  "/:id",
  requireAuth,
  requireRole("farmer"),
  requireFarmOwnership,
  validateBody(updateFarmSchema),
  farmController.updateFarm
);

farmRouter.delete("/:id", requireAuth, requireRole("farmer"), requireFarmOwnership, farmController.deleteFarm);
