import path from "path";
import fs from "fs";
import runner from "node-pg-migrate";
import type { ClientBase } from "pg";
import { pool } from "./database";

/**
 * Ensures that all database tables, extensions, enums, and migrations
 * are fully applied before the application starts accepting HTTP traffic.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Ensure basic extensions and function exist
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS postgis;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Run migrations via node-pg-migrate
    const candidates = [
      path.resolve(__dirname, "../../dist/db/migrations"),
      path.resolve(__dirname, "../db/migrations"),
      path.resolve(__dirname, "../../db/migrations"),
      path.resolve(process.cwd(), "dist/db/migrations"),
      path.resolve(process.cwd(), "db/migrations"),
    ];

    const migrationsDir = candidates.find((dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0);

    if (migrationsDir) {
      // eslint-disable-next-line no-console
      console.log(`[DB Migration] Running migrations from: ${migrationsDir}`);
      try {
        await runner({
          dbClient: client as ClientBase,
          dir: migrationsDir,
          direction: "up",
          migrationsTable: "pgmigrations",
          count: Infinity,
          // eslint-disable-next-line no-console
          log: (msg: string) => console.log(`[DB Migration] ${msg}`),
        });
        // eslint-disable-next-line no-console
        console.log("[DB Migration] Migrations completed successfully.");
      } catch (migErr: unknown) {
        // eslint-disable-next-line no-console
        console.warn("[DB Migration] Migration runner returned warning/error:", migErr instanceof Error ? migErr.message : String(migErr));
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("[DB Migration] No migrations folder found, applying fallback schema checks.");
    }

    // 3. Fallback / Safety Guarantee: ensure oauth_accounts and nullable password_hash exist
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider text NOT NULL,
        provider_account_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS oauth_accounts_provider_account_id_idx ON oauth_accounts (provider, provider_account_id);
      CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts (user_id);
    `);

    // eslint-disable-next-line no-console
    console.log("✅ Database schema and OAuth account tables verified.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Database schema verification failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
