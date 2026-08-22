import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { requireProductOwnership } from "../middleware/requireOwnership";
import { validateBody } from "../middleware/validate";
import { createProductSchema, updateProductSchema } from "../validation/product.schemas";
import { addReviewSchema } from "../validation/review.schemas";

export const productRouter = Router();

productRouter.get("/", productController.listProducts);

productRouter.post(
  "/",
  requireAuth,
  requireRole("farmer"),
  validateBody(createProductSchema),
  productController.createProduct
);

productRouter.get("/:id", productController.getProduct);
productRouter.get("/:id/related", productController.getRelatedProducts);
productRouter.get("/:id/reviews", productController.getProductReviews);
productRouter.post(
  "/:id/reviews",
  requireAuth,
  requireRole("customer"),
  validateBody(addReviewSchema),
  productController.addProductReview
);

productRouter.put(
  "/:id",
  requireAuth,
  requireRole("farmer"),
  requireProductOwnership,
  validateBody(updateProductSchema),
  productController.updateProduct
);

productRouter.delete(
  "/:id",
  requireAuth,
  requireRole("farmer"),
  requireProductOwnership,
  productController.deleteProduct
);
