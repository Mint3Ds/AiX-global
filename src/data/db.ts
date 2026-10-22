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
const globalPool = globalThis as unknown as { visit2valuePool?: Pool };
const pool = globalPool.visit2valuePool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalPool.visit2valuePool = pool;
export const db = drizzle(pool, { schema });
export { pool };
