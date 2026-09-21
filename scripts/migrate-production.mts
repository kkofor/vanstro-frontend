import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["--filter", "@vanstro/db", "migrate:production"], {
  stdio: "inherit",
  env: process.env
});

if (result.status !== 0) process.exit(result.status ?? 1);
