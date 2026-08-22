import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Catalog group (architecture doc §13 "Catalog (5)"):
 *   farms, farm_images, products, product_images, inventory_movements
 *
 * `farms.farmer_id` is a plain FK with no uniqueness constraint — decision #3,
 * a farmer may own any number of farms.
 *
 * `location` columns use `geography(Point,4326)` per the approved PostGIS
 * strategy (§6 of the architecture doc): great-circle distance in meters
 * natively, no manual projection handling, `ST_DWithin` + the `<->` KNN
 * operator for nearby/nearest queries once `farms/nearby` is built (Phase G).
 *
 * `inventory_movements.order_id` is created here as a plain nullable uuid
 * column *without* its foreign key — `orders` doesn't exist yet at this
 * point in migration order. The FK constraint is added in the commerce
 * migration right after `orders` is created.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // --- farms -----------------------------------------------------------
  pgm.createTable("farms", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    farmer_id: {
      type: "uuid",
      notNull: true,
      references: "farmer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    name: { type: "text", notNull: true },
    description: { type: "text" },
    category: { type: "product_category" },
    size_acres: { type: "numeric(6,2)" },
    farming_method: { type: "farming_method" },
    years_active: { type: "integer" },
    verified: { type: "boolean", notNull: true, default: false },
    address_line: { type: "text" },
    location: { type: "geography(Point,4326)" },
    rating_cached: { type: "numeric(2,1)", notNull: true, default: 0 },
    review_count_cached: { type: "integer", notNull: true, default: 0 },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("farms", "farmer_id");
  pgm.createIndex("farms", "category");
  pgm.createIndex("farms", "verified");
  pgm.createIndex("farms", "location", { method: "gist", name: "farms_location_gist" });
  pgm.createTrigger("farms", "farms_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- farm_images -------------------------------------------------------
  pgm.createTable("farm_images", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    farm_id: { type: "uuid", notNull: true, references: "farms(id)", onDelete: "CASCADE" },
    url: { type: "text", notNull: true },
    sort_order: { type: "integer", notNull: true, default: 0 },
  });
  pgm.createIndex("farm_images", "farm_id");

  // --- products ----------------------------------------------------------
  pgm.createTable("products", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    farm_id: { type: "uuid", notNull: true, references: "farms(id)", onDelete: "CASCADE" },
    name: { type: "text", notNull: true },
    category: { type: "product_category" },
    description: { type: "text" },
    price: { type: "numeric(10,2)", notNull: true, check: "price >= 0" },
    unit: { type: "text", notNull: true },
    farming_method: { type: "farming_method" },
    harvest_date: { type: "date" },
    stock: { type: "integer", notNull: true, default: 0, check: "stock >= 0" },
    availability: { type: "availability_status", notNull: true, default: "In Stock" },
    low_stock_threshold: { type: "integer", notNull: true, default: 5 },
    rating_cached: { type: "numeric(2,1)", notNull: true, default: 0 },
    review_count_cached: { type: "integer", notNull: true, default: 0 },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("products", "farm_id");
  pgm.createIndex("products", "category");
  pgm.createIndex("products", "availability");
  pgm.createTrigger("products", "products_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- product_images ------------------------------------------------------
  pgm.createTable("product_images", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "CASCADE" },
    url: { type: "text", notNull: true },
    sort_order: { type: "integer", notNull: true, default: 0 },
  });
  pgm.createIndex("product_images", "product_id");

  // --- inventory_movements ---------------------------------------------
  // Append-only ledger backing the "last movement" column on the Farmer
  // Inventory page. `order_id` FK is added later in the commerce migration.
  pgm.createTable("inventory_movements", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "CASCADE" },
    change: { type: "integer", notNull: true },
    reason: { type: "movement_reason", notNull: true },
    order_id: { type: "uuid" }, // FK added in the commerce migration
    note: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("inventory_movements", "product_id");
  pgm.createIndex("inventory_movements", "order_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("inventory_movements");
  pgm.dropTable("product_images");
  pgm.dropTable("products");
  pgm.dropTable("farm_images");
  pgm.dropTable("farms");
}
