import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.VANSTRO_RUNTIME_MODE !== "deployment") {
  throw new Error("Production migration runner requires VANSTRO_RUNTIME_MODE=deployment.");
}
if (process.env.ALLOW_PRODUCTION_MIGRATION !== "true") {
  throw new Error("Set ALLOW_PRODUCTION_MIGRATION=true after backup and restore-point approval.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient();
try {
  const invalidInventory = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM "inventory_snapshots"
    WHERE "quantityOnHand" < 0
       OR "quantityReserved" < 0
       OR "quantityReserved" > "quantityOnHand"
  `;
  if (Number(invalidInventory[0]?.count ?? 0n) > 0) {
    throw new Error("Inventory preflight failed; reconcile invalid snapshots before migration.");
  }

  await prisma.$executeRawUnsafe(`
    WITH ranked AS (
      SELECT "id", ROW_NUMBER() OVER (ORDER BY "startedAt" DESC, "id" DESC) AS row_number
      FROM "catalog_sync_runs"
      WHERE "source" = 'scheduled' AND "status" = 'running'
    )
    UPDATE "catalog_sync_runs"
    SET "status" = 'failed',
        "error" = 'Superseded during production migration preflight.',
        "finishedAt" = CURRENT_TIMESTAMP
    WHERE "id" IN (SELECT "id" FROM ranked WHERE row_number > 1)
  `).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('relation "catalog_sync_runs" does not exist')) throw error;
  });

  const extensions = await prisma.$queryRaw<Array<{ installed: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS installed
  `;
  if (!extensions[0]?.installed) {
    throw new Error("pg_trgm must be installed by the database administrator before migration.");
  }
} finally {
  await prisma.$disconnect();
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@vanstro/db", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PGOPTIONS: [process.env.PGOPTIONS, "-c lock_timeout=5000 -c statement_timeout=900000"]
        .filter(Boolean)
        .join(" ")
    }
  }
);
if (result.status !== 0) process.exit(result.status ?? 1);
