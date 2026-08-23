import { createApp } from "./app";
import { closePool, verifyDatabaseConnection } from "./config/database";
import { env } from "./config/env";

async function main() {
  try {
    await verifyDatabaseConnection();
    // eslint-disable-next-line no-console
    console.log("✅ Database connection verified");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Could not connect to the database. Check DATABASE_URL in .env.", err);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚜 FarmDirect API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await closePool();
      // eslint-disable-next-line no-console
      console.log("Server closed. Goodbye.");
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
