import EmbeddedPostgres from "embedded-postgres";
import { resolve } from "node:path";
import { existsSync, rmSync } from "node:fs";

const dbDir = resolve("./.pgdata");

function createPg() {
  return new EmbeddedPostgres({
    databaseDir: dbDir,
    user: "visit2value",
    password: "visit2value",
    port: 5432,
    persistent: true,
    initdbFlags: ["-E", "UTF8", "--locale=C"],
  });
}

const action = process.argv[2] || "setup";

if (action === "clean") {
  if (existsSync(dbDir)) {
    console.log("Removing old .pgdata directory...");
    rmSync(dbDir, { recursive: true, force: true });
  }
} else if (action === "setup") {
  if (existsSync(dbDir)) {
    console.log("Removing old .pgdata to recreate with UTF8...");
    rmSync(dbDir, { recursive: true, force: true });
  }
  const pg = createPg();
  console.log("Initializing Postgres cluster with UTF8 encoding in", dbDir);
  await pg.initialise();
  console.log("Starting Postgres temporarily to ensure database exists...");
  await pg.start();
  try {
    await pg.createDatabase("visit2value");
    console.log("Database 'visit2value' created.");
  } catch (err) {
    console.log("Database notice:", err.message);
  }
  await pg.stop();
  console.log("Postgres setup complete.");
} else if (action === "run") {
  const pg = createPg();
  if (!existsSync(dbDir)) {
    console.log("Initializing Postgres cluster with UTF8 encoding...");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("visit2value");
  } catch (e) {
    // database already exists
  }
  console.log("Embedded PostgreSQL running on 127.0.0.1:5432");
  const keepAlive = () => setTimeout(keepAlive, 10000);
  keepAlive();

  const shutdown = async () => {
    console.log("Stopping embedded Postgres...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
