import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: url });
try {
  for (const file of [
    "0001_initial.sql",
    "0002_hotel_workflow.sql",
    "0003_historical_imports.sql",
    "0004_rejection_workflow.sql",
    "0005_task_report_attachments_and_analysis_timings.sql",
    "0006_review_time_tracking.sql",
    "0007_orbyte_attendance_and_handoffs.sql",
    "0008_handoff_legacy_column_cleanup.sql",
    "0009_report_evidence_context.sql",
    "0010_task_rework_history.sql",
  ]) {
    await pool.query(readFileSync(resolve("migrations", file), "utf8"));
    console.log(`Migration applied: ${file}`);
  }
} finally {
  await pool.end();
}
