import { Router } from "express";
import * as farmerController from "../controllers/farmer.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validateBody } from "../middleware/validate";
import { addReviewSchema } from "../validation/review.schemas";

export const farmerRouter = Router();

farmerRouter.get("/:id", farmerController.getFarmerProfile);
farmerRouter.get("/:id/products", farmerController.getFarmerProducts);
farmerRouter.get("/:id/reviews", farmerController.getFarmerReviews);
farmerRouter.post(
  "/:id/reviews",
  requireAuth,
  requireRole("customer"),
  validateBody(addReviewSchema),
  farmerController.addFarmerReview
);
