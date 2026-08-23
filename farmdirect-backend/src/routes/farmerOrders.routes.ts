import { Router } from "express";
import * as farmerOrdersController from "../controllers/farmerOrders.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const farmerOrdersRouter = Router();

farmerOrdersRouter.get("/", requireAuth, requireRole("farmer"), farmerOrdersController.listFarmerOrders);
