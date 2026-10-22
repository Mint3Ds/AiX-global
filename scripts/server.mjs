import { spawn } from "node:child_process";
import { resolve } from "node:path";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") {
  throw new Error("Use server.mjs with dev or start.");
}

const port = process.env.PORT || "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PORT must be a number from 1 to 65535.");
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

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
