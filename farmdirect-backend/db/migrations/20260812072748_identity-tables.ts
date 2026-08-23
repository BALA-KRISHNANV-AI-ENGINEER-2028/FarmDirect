import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Identity group (architecture doc §4, §13 "Identity (5)"):
 *   users, customer_profiles, farmer_profiles, refresh_tokens, password_reset_tokens
 *
 * Also creates the one shared trigger function (`set_updated_at`) that every
 * mutable table in every later migration reuses — defined once here rather
 * than duplicated per migration.
 *
 * Email uniqueness is case-insensitive via a functional unique index on
 * lower(email) rather than the `citext` extension, to avoid pulling in a
 * second extension for one column.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // --- users ---------------------------------------------------------
  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    email: { type: "text", notNull: true },
    password_hash: { type: "text", notNull: true },
    role: { type: "user_role", notNull: true },
    phone: { type: "text" },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("users", "lower(email)", { unique: true, name: "users_email_lower_idx" });
  pgm.createIndex("users", "phone", { unique: true, where: "phone IS NOT NULL" });
  pgm.createTrigger("users", "users_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- customer_profiles (1:1 with users where role = 'customer') ----
  pgm.createTable("customer_profiles", {
    user_id: {
      type: "uuid",
      primaryKey: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    full_name: { type: "text", notNull: true },
    avatar_url: { type: "text" },
    date_of_birth: { type: "date" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createTrigger("customer_profiles", "customer_profiles_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- farmer_profiles (1:1 with users where role = 'farmer') --------
  pgm.createTable("farmer_profiles", {
    user_id: {
      type: "uuid",
      primaryKey: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    full_name: { type: "text", notNull: true },
    avatar_url: { type: "text" },
    experience_years: { type: "integer" },
    verified: { type: "boolean", notNull: true, default: false },
    story: { type: "text" },
    rating_cached: { type: "numeric(2,1)", notNull: true, default: 0 },
    review_count_cached: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createTrigger("farmer_profiles", "farmer_profiles_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // --- refresh_tokens --------------------------------------------------
  // Opaque tokens only ever stored hashed (decision #5) — the raw token
  // never touches the database, only the httpOnly cookie on the client.
  pgm.createTable("refresh_tokens", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    token_hash: { type: "text", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("refresh_tokens", "user_id");
  pgm.createIndex("refresh_tokens", "token_hash", { unique: true });

  // --- password_reset_tokens -------------------------------------------
  pgm.createTable("password_reset_tokens", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    token_hash: { type: "text", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" }, // set when the token is consumed
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("password_reset_tokens", "user_id");
  pgm.createIndex("password_reset_tokens", "token_hash", { unique: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("password_reset_tokens");
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("farmer_profiles");
  pgm.dropTable("customer_profiles");
  pgm.dropTable("users");
  pgm.sql(`DROP FUNCTION IF EXISTS set_updated_at();`);
}
