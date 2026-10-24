/**
 * Clear owner workflow state in the isolated filming database.
 * Reviews, analyses, observations, themes, and evidence links remain.
 */
import nextEnv from "@next/env";
import { Pool } from "pg";

nextEnv.loadEnvConfig(process.cwd());
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const databaseName = new URL(connectionString).pathname.slice(1);
if (databaseName !== "visit2value_demo_filming") {
  throw new Error(
    `Refusing to reset ${databaseName}. Use the isolated visit2value_demo_filming database.`,
  );
}

const pool = new Pool({ connectionString });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const before = await client.query(
    "SELECT (SELECT count(*) FROM reviews)::int AS reviews, (SELECT count(*) FROM observations)::int AS observations",
  );

  // Delete child records before parent tasks; review data is left untouched.
  await client.query("DELETE FROM replies");
  await client.query("DELETE FROM handoffs");
  await client.query("DELETE FROM tasks");
  await client.query("DELETE FROM activity_events");
  await client.query(
    "UPDATE themes SET status = 'suggested', updated_at = now() WHERE status <> 'suggested'",
  );
  await client.query(
    "UPDATE theme_memberships SET confirmation = 'suggested', updated_at = now() WHERE confirmation <> 'suggested'",
  );

  const after = await client.query(
    "SELECT (SELECT count(*) FROM reviews)::int AS reviews, (SELECT count(*) FROM observations)::int AS observations, (SELECT count(*) FROM tasks)::int AS tasks, (SELECT count(*) FROM replies)::int AS replies, (SELECT count(*) FROM activity_events)::int AS events, (SELECT count(*) FROM themes WHERE status <> 'suggested')::int AS decided_themes",
  );
  if (
    before.rows[0].reviews !== after.rows[0].reviews ||
    before.rows[0].observations !== after.rows[0].observations
  ) {
    throw new Error("Review or observation counts changed; rolling back.");
  }
  await client.query("COMMIT");
  console.log("Demo workflow reset:", after.rows[0]);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
