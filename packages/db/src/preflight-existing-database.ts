import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient();
const failures: Array<{ check: string; count: number }> = [];

async function tableExists(name: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ present: boolean }>>(
    "SELECT to_regclass($1) IS NOT NULL AS present",
    `public.${name}`
  );
  return rows[0]?.present === true;
}

try {
  if (await tableExists("inventory_reservations")) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM (
        SELECT "paymentSessionId", "skuId"
        FROM "inventory_reservations"
        WHERE "status" = 'active' AND "paymentSessionId" IS NOT NULL
        GROUP BY "paymentSessionId", "skuId"
        HAVING COUNT(*) > 1
      ) duplicates
    `;
    const count = Number(rows[0]?.count ?? 0n);
    if (count) failures.push({ check: "duplicate active reservations", count });
  }

  if (await tableExists("erp_order_links") && await tableExists("orders")) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM "erp_order_links" links
      LEFT JOIN "orders" orders ON orders."id" = links."websiteOrderId"
      WHERE orders."id" IS NULL
    `;
    const count = Number(rows[0]?.count ?? 0n);
    if (count) failures.push({ check: "orphan ERP order links", count });
  }

  if (await tableExists("customer_addresses")) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM (
        SELECT "userId"
        FROM "customer_addresses"
        WHERE "isDefault" = true
        GROUP BY "userId"
        HAVING COUNT(*) > 1
      ) duplicates
    `;
    const count = Number(rows[0]?.count ?? 0n);
    if (count) failures.push({ check: "multiple default addresses", count });
  }

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, failures: [] }, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
