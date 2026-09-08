import { Router } from "express";
import * as aiInsightsController from "../controllers/farmerAIInsights.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../utils/asyncHandler";

export const farmerAIInsightsRouter = Router();

farmerAIInsightsRouter.get(
  "/",
  requireAuth,
  requireRole("farmer"),
  asyncHandler(aiInsightsController.getAIInsightsHandler)
);

farmerAIInsightsRouter.post(
  "/refresh",
  requireAuth,
  requireRole("farmer"),
  asyncHandler(aiInsightsController.refreshAIInsightsHandler)
);
