import { spawn } from "node:child_process";
import { resolve } from "node:path";
import net from "node:net";
import { existsSync } from "node:fs";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") {
  throw new Error("Use server.mjs with dev or start.");
}

const port = process.env.PORT || "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PORT must be a number from 1 to 65535.");
}

function checkPort(p, host = "127.0.0.1") {
  return new Promise((res) => {
    const s = net.createConnection({ port: p, host });
    s.once("connect", () => {
      s.destroy();
      res(true);
    });
    s.once("error", () => res(false));
  });
}

let pgInstance = null;
const isPgRunning = await checkPort(5432);
if (!isPgRunning) {
  try {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const dbDir = resolve("./.pgdata");
    pgInstance = new EmbeddedPostgres({
      databaseDir: dbDir,
      user: "visit2value",
      password: "visit2value",
      port: 5432,
      persistent: true,
      initdbFlags: ["-E", "UTF8", "--locale=C"],
    });
    if (!existsSync(dbDir)) {
      console.log("Initializing embedded PostgreSQL cluster...");
      await pgInstance.initialise();
    }
    console.log("Starting embedded PostgreSQL server on port 5432...");
    await pgInstance.start();
    try {
      await pgInstance.createDatabase("visit2value");
    } catch {
      // database already created
    }
  } catch (err) {
    console.warn("Notice: embedded Postgres startup:", err.message);
  }
}

const child = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    mode,
    "--hostname",
    process.env.HOST || "0.0.0.0",
    "--port",
    port,
  ],
  { stdio: "inherit", env: process.env },
);

const cleanup = async (signal) => {
  if (child) child.kill(signal);
  if (pgInstance) {
    try {
      await pgInstance.stop();
    } catch {}
  }
};

process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));
child.on("exit", async (code, signal) => {
  if (pgInstance) {
    try {
      await pgInstance.stop();
    } catch {}
  }
  process.exitCode = code ?? (signal ? 1 : 0);
});
