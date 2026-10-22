import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
await import("./seed-impl");
