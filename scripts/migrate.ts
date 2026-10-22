import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: url });
try {
  await pool.query(
    readFileSync(resolve("migrations/0001_initial.sql"), "utf8"),
  );
  console.log("Migration applied");
} finally {
  await pool.end();
}
