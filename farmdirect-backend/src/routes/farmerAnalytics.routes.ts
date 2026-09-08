import { Router } from "express";
import * as analyticsController from "../controllers/farmerAnalytics.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../utils/asyncHandler";

export const farmerAnalyticsRouter = Router();

farmerAnalyticsRouter.get(
  "/",
  requireAuth,
  requireRole("farmer"),
  asyncHandler(analyticsController.getAnalyticsHandler)
);
