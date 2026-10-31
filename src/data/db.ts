import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://missing:missing@localhost:5432/missing";

export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required. See .env.example.");
}

const globalPool = globalThis as unknown as {
  visit2valuePool?: Pool;
  visit2valueConnectionString?: string;
};
const reusablePool =
  process.env.NODE_ENV !== "production" &&
  globalPool.visit2valueConnectionString === connectionString
    ? globalPool.visit2valuePool
    : undefined;

if (globalPool.visit2valuePool && !reusablePool) {
  // Next.js dev reloads can preserve globalThis after .env.local changes.
  // Drain the previous pool so new requests use the new connection string.
  void globalPool.visit2valuePool.end().catch(() => undefined);
}

const pool = reusablePool ?? new Pool({
  connectionString,
  // Fail quickly when the database is unreachable instead of leaving the UI
  // waiting indefinitely for a socket or queued connection.
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

if (process.env.NODE_ENV !== "production") {
  globalPool.visit2valuePool = pool;
  globalPool.visit2valueConnectionString = connectionString;
}

if (!reusablePool) {
  // pg emits this for an idle socket that disconnects. A listener prevents
  // an intermittent network/database restart from becoming an unhandled
  // process error; the failed client is removed and the pool reconnects.
  pool.on("error", (error: NodeJS.ErrnoException) => {
    console.error("[database] Idle PostgreSQL connection ended", {
      code: error.code || "UNKNOWN",
    });
  });
}

export const db = drizzle(pool, { schema });
export { pool };
