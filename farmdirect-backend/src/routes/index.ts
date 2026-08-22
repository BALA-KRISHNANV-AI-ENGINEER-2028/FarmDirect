import { Router } from "express";
import { query } from "../config/database";
import { asyncHandler } from "../utils/asyncHandler";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { farmerRouter } from "./farmer.routes";
import { farmRouter } from "./farm.routes";
import { productRouter } from "./product.routes";
import { inventoryRouter } from "./inventory.routes";
import { cartRouter } from "./cart.routes";
import { addressRouter } from "./address.routes";
import { orderRouter } from "./order.routes";
import { farmerOrdersRouter } from "./farmerOrders.routes";
import { favoriteRouter } from "./favorite.routes";
import { notificationRouter } from "./notification.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/farmers", farmerRouter);
apiRouter.use("/farms", farmRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/addresses", addressRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/farmer/orders", farmerOrdersRouter);
apiRouter.use("/favorites", favoriteRouter);
apiRouter.use("/notifications", notificationRouter);

/**
 * Phase H (frontend integration) is the only remaining phase — no more
 * feature routers to add here.
 */
apiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const dbResult = await query<{ now: string; postgis_version: string | null }>(
      `SELECT now()::text AS now,
              (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis_version`
    );
    const row = dbResult.rows[0];
    res.json({
      status: "ok",
      time: row.now,
      database: "connected",
      postgis: row.postgis_version ? `enabled (v${row.postgis_version})` : "not enabled",
    });
  })
);
