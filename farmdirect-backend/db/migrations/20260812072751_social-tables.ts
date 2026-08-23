import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Social group (architecture doc §13 "Social (8)"):
 *   product_reviews, farm_reviews, farmer_reviews,
 *   product_favorites, farm_favorites, farmer_favorites,
 *   notification_preferences, notifications
 *
 * Reviews and favorites are split per-target with real foreign keys
 * (decision #1) rather than a single polymorphic table — the database
 * itself now rejects a review/favorite pointing at a product, farm, or
 * farmer that doesn't exist, which a `target_type`/`target_id` pair
 * couldn't guarantee.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // --- product_reviews / farm_reviews / farmer_reviews --------------------
  pgm.createTable("product_reviews", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "CASCADE" },
    rating: { type: "smallint", notNull: true, check: "rating BETWEEN 1 AND 5" },
    comment: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("product_reviews", "product_reviews_customer_product_unique", {
    unique: ["customer_id", "product_id"],
  });
  pgm.createIndex("product_reviews", "product_id");

  pgm.createTable("farm_reviews", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    farm_id: { type: "uuid", notNull: true, references: "farms(id)", onDelete: "CASCADE" },
    rating: { type: "smallint", notNull: true, check: "rating BETWEEN 1 AND 5" },
    comment: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("farm_reviews", "farm_reviews_customer_farm_unique", {
    unique: ["customer_id", "farm_id"],
  });
  pgm.createIndex("farm_reviews", "farm_id");

  pgm.createTable("farmer_reviews", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    farmer_id: {
      type: "uuid",
      notNull: true,
      references: "farmer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    rating: { type: "smallint", notNull: true, check: "rating BETWEEN 1 AND 5" },
    comment: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("farmer_reviews", "farmer_reviews_customer_farmer_unique", {
    unique: ["customer_id", "farmer_id"],
  });
  pgm.createIndex("farmer_reviews", "farmer_id");

  // --- product_favorites / farm_favorites / farmer_favorites --------------
  pgm.createTable("product_favorites", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "CASCADE" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("product_favorites", "product_favorites_customer_product_unique", {
    unique: ["customer_id", "product_id"],
  });
  pgm.createIndex("product_favorites", "customer_id");

  pgm.createTable("farm_favorites", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    farm_id: { type: "uuid", notNull: true, references: "farms(id)", onDelete: "CASCADE" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("farm_favorites", "farm_favorites_customer_farm_unique", {
    unique: ["customer_id", "farm_id"],
  });
  pgm.createIndex("farm_favorites", "customer_id");

  pgm.createTable("farmer_favorites", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    farmer_id: {
      type: "uuid",
      notNull: true,
      references: "farmer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("farmer_favorites", "farmer_favorites_customer_farmer_unique", {
    unique: ["customer_id", "farmer_id"],
  });
  pgm.createIndex("farmer_favorites", "customer_id");

  // --- notification_preferences -------------------------------------------
  // One boolean column per toggle currently in CustomerProfile.tsx /
  // FarmerProfile.tsx's Notifications tabs — explicit columns rather than
  // jsonb so the API can validate/typecheck each flag.
  pgm.createTable("notification_preferences", {
    user_id: { type: "uuid", primaryKey: true, references: "users(id)", onDelete: "CASCADE" },
    // customer-facing toggles
    order_updates: { type: "boolean", notNull: true, default: true },
    price_drops: { type: "boolean", notNull: true, default: true },
    new_harvests: { type: "boolean", notNull: true, default: true },
    promotions: { type: "boolean", notNull: true, default: true },
    // farmer-facing toggles
    new_order_alerts: { type: "boolean", notNull: true, default: true },
    low_stock_alerts: { type: "boolean", notNull: true, default: true },
    ai_insight_updates: { type: "boolean", notNull: true, default: true },
    customer_reviews: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createTrigger("notification_preferences", "notification_preferences_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- notifications ---------------------------------------------------
  pgm.createTable("notifications", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    type: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    message: { type: "text", notNull: true },
    read: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("notifications", ["user_id", "read"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("notifications");
  pgm.dropTable("notification_preferences");
  pgm.dropTable("farmer_favorites");
  pgm.dropTable("farm_favorites");
  pgm.dropTable("product_favorites");
  pgm.dropTable("farmer_reviews");
  pgm.dropTable("farm_reviews");
  pgm.dropTable("product_reviews");
}
