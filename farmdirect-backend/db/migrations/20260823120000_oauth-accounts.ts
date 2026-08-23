import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Make password_hash optional so OAuth users (who have no password) can be stored cleanly.
  pgm.alterColumn("users", "password_hash", { notNull: false });

  // Create oauth_accounts table for federated identity linking
  pgm.createTable("oauth_accounts", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    provider: { type: "text", notNull: true },
    provider_account_id: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createIndex("oauth_accounts", ["provider", "provider_account_id"], {
    unique: true,
    name: "oauth_accounts_provider_account_id_idx",
  });
  pgm.createIndex("oauth_accounts", "user_id");

  pgm.createTrigger("oauth_accounts", "oauth_accounts_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("oauth_accounts");
  pgm.alterColumn("users", "password_hash", { notNull: true });
}
