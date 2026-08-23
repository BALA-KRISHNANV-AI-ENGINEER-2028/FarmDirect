import { z } from "zod";

/** Mirrors the `product_category` DB enum exactly — see db/migrations/…_enable-extensions-and-enums.ts */
export const categorySchema = z.enum([
  "Vegetables",
  "Fruits",
  "Grains",
  "Spices",
  "Dairy",
  "Nuts & Oils",
]);

/** Mirrors the `farming_method` DB enum exactly. */
export const farmingMethodSchema = z.enum([
  "Organic",
  "Natural Farming",
  "Conventional",
  "Pesticide-Free",
]);

/** Mirrors the `availability_status` DB enum exactly. */
export const availabilitySchema = z.enum(["In Stock", "Low Stock", "Out of Stock"]);

/** Mirrors the `movement_reason` DB enum exactly. */
export const movementReasonSchema = z.enum(["harvest", "sale", "adjustment", "order_cancelled"]);

/** Mirrors the `order_status` DB enum exactly — canonical lifecycle, decision #2. */
export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);
