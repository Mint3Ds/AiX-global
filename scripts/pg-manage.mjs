import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const command = process.argv[2] || "status";
const pgBin = resolve("node_modules/@embedded-postgres/windows-x64/native/bin/postgres.exe");
const pgCtl = resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe");
const pgData = resolve(".pgdata");
const pidFile = resolve(".pgdata/postmaster.pid");

function isRunning() {
  const res = spawnSync(pgCtl, ["status", "-D", pgData], { encoding: "utf8" });
  return res.status === 0;
}

if (command === "start") {
  if (isRunning()) {
    console.log("PostgreSQL is already running.");
    process.exit(0);
  }
  if (existsSync(pidFile)) {
    try {
      rmSync(pidFile, { force: true });
    } catch {}
  }
  console.log("Starting PostgreSQL embedded server on port 5432...");
  const child = spawn(pgBin, ["-D", pgData, "-p", "5432"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log(`PostgreSQL started in background (PID: ${child.pid}).`);
} else if (command === "stop") {
  console.log("Stopping PostgreSQL...");
  const res = spawnSync(pgCtl, ["stop", "-D", pgData, "-m", "fast"], {
    stdio: "inherit",
  });
  process.exit(res.status ?? 0);
} else if (command === "status") {
  const res = spawnSync(pgCtl, ["status", "-D", pgData], {
    stdio: "inherit",
  });
  process.exit(res.status ?? 0);
} else {
  console.log("Usage: node scripts/pg-manage.mjs [start|stop|status]");
  process.exit(1);
}
