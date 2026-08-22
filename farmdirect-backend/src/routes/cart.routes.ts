import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validateBody } from "../middleware/validate";
import { addCartItemSchema, updateCartItemSchema } from "../validation/cart.schemas";

export const cartRouter = Router();

cartRouter.use(requireAuth, requireRole("customer"));

cartRouter.get("/", cartController.getCart);
cartRouter.post("/items", validateBody(addCartItemSchema), cartController.addItem);
cartRouter.put("/items/:productId", validateBody(updateCartItemSchema), cartController.updateItem);
cartRouter.delete("/items/:productId", cartController.removeItem);
cartRouter.delete("/", cartController.clearCart);
