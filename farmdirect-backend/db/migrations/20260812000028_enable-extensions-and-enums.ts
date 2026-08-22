/* eslint-disable @typescript-eslint/naming-convention */
import type { MigrationBuilder } from "node-pg-migrate";

export const shorthands = undefined;

/**
 * Foundation migration — no tables yet (those come in Phase B). This just
 * enables the two extensions every later migration depends on and creates
 * every enum type used across the schema, per the approved architecture doc:
 *
 *   - pgcrypto: gen_random_uuid() for all primary keys
 *   - postgis:  geography(Point,4326) columns + ST_DWithin / <-> KNN queries
 *
 * Enum values are UPPER_SNAKE_CASE for order_status (matches the approved
 * lifecycle exactly) and Title Case for the two catalog enums that mirror
 * frontend string literals (Category, FarmingMethod) so no translation layer
 * is needed between DB rows and API responses during Phase H integration.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension("pgcrypto", { ifNotExists: true });
  pgm.createExtension("postgis", { ifNotExists: true });

  pgm.createType("user_role", ["customer", "farmer"]);

  pgm.createType("product_category", [
    "Vegetables",
    "Fruits",
    "Grains",
    "Spices",
    "Dairy",
    "Nuts & Oils",
  ]);

  pgm.createType("farming_method", [
    "Organic",
    "Natural Farming",
    "Conventional",
    "Pesticide-Free",
  ]);

  pgm.createType("availability_status", ["In Stock", "Low Stock", "Out of Stock"]);

  pgm.createType("movement_reason", ["harvest", "sale", "adjustment", "order_cancelled"]);

  // Canonical order lifecycle — decision #2. CANCELLED is a terminal branch,
  // not a linear step; enforced in the order-status service, not the enum.
  pgm.createType("order_status", [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropType("order_status");
  pgm.dropType("movement_reason");
  pgm.dropType("availability_status");
  pgm.dropType("farming_method");
  pgm.dropType("product_category");
  pgm.dropType("user_role");

  // Extensions are left in place on down — dropping postgis/pgcrypto is
  // rarely what you want mid-development and can affect other schemas on
  // the same database. Drop manually if a full reset is truly needed.
}
