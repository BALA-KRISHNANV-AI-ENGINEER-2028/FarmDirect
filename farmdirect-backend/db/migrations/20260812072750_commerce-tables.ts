import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Commerce group (architecture doc §13 "Commerce (5)"):
 *   addresses, cart_items, orders, order_items, order_status_events
 *
 * `orders.status` uses the canonical `order_status` enum from decision #2 —
 * PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY →
 * DELIVERED, with CANCELLED as a terminal side-branch. `order_status_events`
 * is the append-only ledger; `orders.status` is kept as a mirror of the
 * latest event, updated in the same transaction by the order service
 * (Phase F) — not by a DB trigger, so business rules (e.g. "can't cancel a
 * delivered order") produce clean API errors instead of silent DB rejection.
 *
 * Also adds the `inventory_movements.order_id` foreign key that couldn't be
 * created in the catalog migration because `orders` didn't exist yet.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // --- addresses -----------------------------------------------------
  pgm.createTable("addresses", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    label: { type: "text" },
    full_name: { type: "text" },
    phone: { type: "text" },
    address_line: { type: "text", notNull: true },
    city: { type: "text" },
    state: { type: "text" },
    postal_code: { type: "text" },
    location: { type: "geography(Point,4326)" },
    is_default: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("addresses", "customer_id");
  // Only one default address per customer.
  pgm.createIndex("addresses", "customer_id", {
    unique: true,
    where: "is_default",
    name: "addresses_one_default_per_customer",
  });
  pgm.createTrigger("addresses", "addresses_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- cart_items ------------------------------------------------------
  pgm.createTable("cart_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "CASCADE",
    },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "CASCADE" },
    quantity: { type: "integer", notNull: true, check: "quantity > 0" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("cart_items", "cart_items_customer_product_unique", {
    unique: ["customer_id", "product_id"],
  });
  pgm.createTrigger("cart_items", "cart_items_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- orders ------------------------------------------------------------
  pgm.createTable("orders", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    order_number: { type: "text", notNull: true },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customer_profiles(user_id)",
      onDelete: "RESTRICT",
    },
    status: { type: "order_status", notNull: true, default: "PENDING" },
    delivery_address_id: { type: "uuid", references: "addresses(id)", onDelete: "SET NULL" },
    delivery_address_snapshot: { type: "jsonb" },
    delivery_method: { type: "text" },
    payment_method: { type: "text" },
    subtotal: { type: "numeric(10,2)", notNull: true, check: "subtotal >= 0" },
    delivery_fee: { type: "numeric(10,2)", notNull: true, default: 0, check: "delivery_fee >= 0" },
    total: { type: "numeric(10,2)", notNull: true, check: "total >= 0" },
    estimated_delivery_at: { type: "timestamptz" },
    placed_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("orders", "order_number", { unique: true });
  pgm.createIndex("orders", "customer_id");
  pgm.createIndex("orders", "status");
  pgm.createTrigger("orders", "orders_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- order_items ---------------------------------------------------------
  // Snapshots (name/unit/price) protect order history if a product is later
  // edited or deleted — mirrors how the frontend's OrderItem type already
  // stores these inline rather than re-deriving from the live product.
  pgm.createTable("order_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    order_id: { type: "uuid", notNull: true, references: "orders(id)", onDelete: "CASCADE" },
    product_id: { type: "uuid", notNull: true, references: "products(id)", onDelete: "RESTRICT" },
    farm_id: { type: "uuid", notNull: true, references: "farms(id)", onDelete: "RESTRICT" },
    name_snapshot: { type: "text", notNull: true },
    unit_snapshot: { type: "text", notNull: true },
    price_snapshot: { type: "numeric(10,2)", notNull: true, check: "price_snapshot >= 0" },
    quantity: { type: "integer", notNull: true, check: "quantity > 0" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("order_items", "order_id");
  pgm.createIndex("order_items", "product_id");
  pgm.createIndex("order_items", "farm_id");

  // --- order_status_events -------------------------------------------------
  // Append-only timeline backing StatusStepper.tsx / the farmer kanban view.
  pgm.createTable("order_status_events", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    order_id: { type: "uuid", notNull: true, references: "orders(id)", onDelete: "CASCADE" },
    status: { type: "order_status", notNull: true },
    note: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("order_status_events", "order_id");

  // --- deferred FK from Phase B catalog migration -------------------------
  pgm.addConstraint("inventory_movements", "inventory_movements_order_id_fkey", {
    foreignKeys: {
      columns: "order_id",
      references: "orders(id)",
      onDelete: "SET NULL",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("inventory_movements", "inventory_movements_order_id_fkey");
  pgm.dropTable("order_status_events");
  pgm.dropTable("order_items");
  pgm.dropTable("orders");
  pgm.dropTable("cart_items");
  pgm.dropTable("addresses");
}
