import { Pool } from "pg";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
if (process.env.CONFIRM_DEMO_RESET !== "yes")
  throw new Error(
    "Set CONFIRM_DEMO_RESET=yes to delete all demo database data.",
  );
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("Demo database reset. Run db:migrate and db:seed.");
} finally {
  await pool.end();
}
