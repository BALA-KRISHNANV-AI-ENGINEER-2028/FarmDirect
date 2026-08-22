import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";

/**
 * Single shared connection pool for the process. Models import `query`/`withTransaction`
 * from here rather than constructing their own clients — keeps pooling and error
 * handling centralized in one place.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  // Errors on idle clients (e.g. connection dropped by the DB) — log and let the
  // pool recover; this is not a request-scoped error so there's no res to send to.
  // eslint-disable-next-line no-console
  console.error("Unexpected error on idle Postgres client", err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Runs `fn` inside a single transaction. Commits on success, rolls back and
 * rethrows on any error. Use this for anything that touches more than one
 * table and must succeed or fail atomically (e.g. registration, order creation).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifies the pool can actually reach the database and that PostGIS is
 * enabled. Called once at boot so a bad DB config fails immediately with a
 * clear message instead of surfacing on the first real request.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
