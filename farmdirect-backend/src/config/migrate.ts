import path from "path";
import fs from "fs";
import runner from "node-pg-migrate";
import type { ClientBase } from "pg";
import { pool } from "./database";

/**
 * Custom logger for node-pg-migrate:
 * - Formats migration messages with [DB Migration] prefix
 * - Filters out benign "Can't determine timestamp" warnings caused by 14-digit timestamps (YYYYMMDDHHmmss)
 *   which node-pg-migrate parses numerically and sorts chronologically
 */
const migrationLogger = {
  info: (msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[DB Migration] ${msg}`);
  },
  warn: (msg: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[DB Migration] ${msg}`);
  },
  error: (msg: string) => {
    // Suppress false-positive warning for 14-digit YYYYMMDDHHmmss timestamp filenames
    if (typeof msg === "string" && msg.includes("Can't determine timestamp")) {
      return;
    }
    // eslint-disable-next-line no-console
    console.error(`[DB Migration] ${msg}`);
  },
  debug: () => {
    // Debug messages suppressed in standard production logs
  },
};

/**
 * Ensures that all database tables, extensions, enums, and migrations
 * are fully applied before the application starts accepting HTTP traffic.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Ensure basic extensions and function exist (safe, idempotent)
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

    // 2. Locate the migrations directory containing valid migration files (.js or .ts)
    const isCompiled = __filename.endsWith(".js");
    const candidates = isCompiled
      ? [
          path.resolve(__dirname, "../../db/migrations"),
          path.resolve(__dirname, "../../../dist/db/migrations"),
          path.resolve(process.cwd(), "dist/db/migrations"),
          path.resolve(process.cwd(), "farmdirect-backend/dist/db/migrations"),
        ]
      : [
          path.resolve(__dirname, "../../db/migrations"),
          path.resolve(process.cwd(), "db/migrations"),
          path.resolve(process.cwd(), "farmdirect-backend/db/migrations"),
        ];

    const validExtension = isCompiled ? /\.js$/ : /\.(?:ts|js)$/;

    const migrationsDir = candidates.find((dir) => {
      if (!fs.existsSync(dir)) return false;
      const files = fs.readdirSync(dir);
      return files.some((f) => validExtension.test(f) && !f.endsWith(".map") && !f.endsWith(".d.ts"));
    });

    if (!migrationsDir) {
      throw new Error(
        `[DB Migration] No migrations folder with valid migration scripts found. Searched paths: ${candidates.join(", ")}`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[DB Migration] Running migrations from: ${migrationsDir}`);

    try {
      await runner({
        dbClient: client as ClientBase,
        dir: migrationsDir,
        direction: "up",
        migrationsTable: "pgmigrations",
        singleTransaction: true,
        checkOrder: true,
        count: Infinity,
        // CRITICAL: Ignore source-maps (.js.map), type declarations (.d.ts), hidden files,
        // and any non-executable files so node-pg-migrate only requires valid migration files.
        ignorePattern: "(?:\\..*|.*\\.map$|.*\\.d\\.ts$|.*(?<!\\.(?:js|ts|sql))$)",
        logger: migrationLogger,
      });
      // eslint-disable-next-line no-console
      console.log("[DB Migration] Migrations completed successfully.");
    } catch (migErr: unknown) {
      const errorMsg = migErr instanceof Error ? migErr.message : String(migErr);
      // eslint-disable-next-line no-console
      console.error(`❌ [DB Migration] Migration execution failed: ${errorMsg}`);
      throw new Error(`Database migration failed: ${errorMsg}`);
    }

    // 3. Verify required database schema exists
    const requiredTables = [
      "users",
      "customer_profiles",
      "farmer_profiles",
      "farms",
      "products",
      "orders",
      "oauth_accounts",
      "pgmigrations",
    ];

    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1::text[])
    `;
    const { rows } = await client.query(checkQuery, [requiredTables]);
    const existingTables = new Set(rows.map((r: { table_name: string }) => r.table_name));
    const missingTables = requiredTables.filter((t) => !existingTables.has(t));

    if (missingTables.length > 0) {
      throw new Error(
        `Database schema verification failed: Missing required table(s): ${missingTables.join(", ")}`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Database schema verified (${existingTables.size}/${requiredTables.length} core tables active).`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Database schema verification failed:", err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    client.release();
  }
}

