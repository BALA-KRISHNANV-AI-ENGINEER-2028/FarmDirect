import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validateBody } from "../middleware/validate";
import { createOrderSchema, updateOrderStatusSchema } from "../validation/order.schemas";

export const orderRouter = Router();

orderRouter.use(requireAuth);

orderRouter.post("/", requireRole("customer"), validateBody(createOrderSchema), orderController.createOrder);
orderRouter.get("/", requireRole("customer"), orderController.listMyOrders);

// No requireRole here — accessible by the owning customer or a farmer with
// an item on the order; the service enforces that distinction.
orderRouter.get("/:id", orderController.getOrder);

orderRouter.put(
  "/:id/status",
  requireRole("farmer"),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);
