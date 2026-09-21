/**
 * V11-2 Browser harness seed — synthetic actors for a disposable PG16
 * database only. Never run against a persistent or production database: the
 * guard below fails unless the database name carries test/disposable/fixture
 * and ALLOW_V11_AUTH_SEED=true is set. Credentials exist only in the process
 * environment of the harness run and never leave it: stdout (which the run
 * script persists as evidence) carries actor emails and ids only.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, bootstrapDashboardRbac, hashPassword } from "../../packages/db/dist/index.js";

const databaseUrl = process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (process.env.ALLOW_V11_AUTH_SEED?.trim().toLowerCase() !== "true") {
  throw new Error("ALLOW_V11_AUTH_SEED=true is required.");
}
if (!/(test|disposable|fixture)/i.test(new URL(databaseUrl).pathname)) {
  throw new Error("V11 auth seed requires a test/disposable/fixture database name.");
}

const adminEmail = process.env.V11_ADMIN_EMAIL ?? "v11-admin@vanstro.test";
const customerEmail = process.env.V11_CUSTOMER_EMAIL ?? "v11-customer@vanstro.test";
const noDashAdminEmail = process.env.V11_NODASH_EMAIL ?? "v11-nodash-admin@vanstro.test";
const partialAdminEmail = process.env.V11_PARTIAL_EMAIL ?? "v11-partial-admin@vanstro.test";
const readerEmail = process.env.V11_READER_EMAIL ?? "v11-reader@vanstro.test";
const password = process.env.V11_SEED_PASSWORD ?? "abcd1234abcd5678";

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  await bootstrapDashboardRbac(prisma);

  const credential = hashPassword(password);
  // Dashboard read/edit groups for the V11 slices. settings.read exposes the
  // S08 settings route; settings.write is the independent P3/P6 mutation gate.
  // Email stays out so the overview keeps a real "无权限" cell for PII; audit
  // read is granted so the browser acceptance can verify create-audit deltas
  // (B05/B06) through /dashboard/audit-logs.
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "products.read", "inventory.read", "orders.read", "users.read", "dealers.read", "crm.read", "leads.read", "erp.sync.read", "service_accounts.manage", "products.write", "pricing.write", "inventory.write", "categories.write", "orders.update", "orders.assign", "crm.update", "users.manage", "sessions.revoke", "settings.read", "settings.write", "cli.access", "audit_logs.read"] } },
    select: { id: true }
  });
  if (permissions.length !== 23) throw new Error("dashboard permission group missing after RBAC bootstrap.");

  const adminRole = await prisma.role.create({
    data: {
      key: "v11-shell-admin",
      name: "V11 Admin",
      rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
    }
  });
  const customerRole = await prisma.role.create({
    data: { key: "v11-shell-customer", name: "V11 Customer" }
  });
  const noDashRole = await prisma.role.create({
    data: { key: "v11-shell-nodash", name: "V11 No-Dash Admin" }
  });
  // Partial admin: dashboard.access only (no module read grants) — the
  // actor for the "known available + deny → forbidden after login"
  // returnTo case.
  const dashOnlyPermission = await prisma.permission.findUnique({
    where: { key: "dashboard.access" }
  });
  if (!dashOnlyPermission) throw new Error("dashboard.access permission missing after RBAC bootstrap.");
  const partialRole = await prisma.role.create({
    data: {
      key: "v11-shell-partial",
      name: "V11 Partial Admin",
      rolePermissions: { create: { permissionId: dashOnlyPermission.id } }
    }
  });
  // Read-only viewer: all catalog/commerce READ grants, no write grants —
  // the actor for the read-only detail drawer and no-write-controls
  // contracts (full admin now carries the write grants and sees edit
  // surfaces; the partial admin has no module reads at all).
  const readerPermissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "products.read", "inventory.read", "orders.read", "users.read", "dealers.read", "crm.read", "leads.read", "erp.sync.read", "settings.read"] } },
    select: { id: true }
  });
  if (readerPermissions.length !== 10) throw new Error("read-only permission group missing after RBAC bootstrap.");
  const readerRole = await prisma.role.create({
    data: {
      key: "v11-shell-reader",
      name: "V11 Read-Only Viewer",
      rolePermissions: { create: readerPermissions.map((permission) => ({ permissionId: permission.id })) }
    }
  });

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      kind: "admin",
      status: "active",
      userRoles: { create: { roleId: adminRole.id } },
      passwordCredential: { create: { ...credential } }
    }
  });
  await prisma.user.create({
    data: {
      email: customerEmail,
      kind: "customer",
      status: "active",
      userRoles: { create: { roleId: customerRole.id } },
      passwordCredential: { create: { ...credential } }
    }
  });
  await prisma.user.create({
    data: {
      email: noDashAdminEmail,
      kind: "admin",
      status: "active",
      userRoles: { create: { roleId: noDashRole.id } },
      passwordCredential: { create: { ...credential } }
    }
  });
  const partialAdmin = await prisma.user.create({
    data: {
      email: partialAdminEmail,
      kind: "admin",
      status: "active",
      userRoles: { create: { roleId: partialRole.id } },
      passwordCredential: { create: { ...credential } }
    }
  });
  const reader = await prisma.user.create({
    data: {
      email: readerEmail,
      kind: "admin",
      status: "active",
      userRoles: { create: { roleId: readerRole.id } },
      passwordCredential: { create: { ...credential } }
    }
  });

  // The synthetic password stays in the harness process environment only:
  // the run script passes V11_SEED_PASSWORD to the acceptance runner and
  // never persists it (seed.json is evidence and must carry no credentials).
  // V11-6 commerce slice: one synthetic paid order so the real orders list
  // has a row for the read-only detail drawer. All identity fields are
  // synthetic and non-routable (vanstro.test), never recorded as evidence.
  const session = await prisma.paymentSession.create({
    data: {
      guestEmail: "synthetic-buyer@vanstro.test",
      guestFirstName: "Synthetic",
      guestLastName: "Buyer",
      guestPhone: "555-0100",
      guestOrderToken: "synthetic-order-token-" + randomUUID(),
      status: "paid",
      fulfillment: "pickup",
      paymentMethod: "card",
      items: [],
      subtotalCents: 10000,
      taxCents: 1300,
      totalCents: 11300,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });
  const order = await prisma.order.create({
    data: {
      email: "synthetic-buyer@vanstro.test",
      firstName: "Synthetic",
      lastName: "Buyer",
      phone: "555-0100",
      guestOrderToken: "synthetic-order-token-" + randomUUID(),
      paymentMethod: "card",
      paymentSessionId: session.id,
      status: "paid",
      fulfillment: "pickup",
      currency: "CAD",
      subtotalCents: 10000,
      discountCents: 0,
      taxCents: 1300,
      shippingCents: 0,
      totalCents: 11300,
      items: {
        create: [
          {
            skuCode: "SYN-CAB-1",
            productName: "Synthetic Cabinet",
            quantity: 1,
            unitPriceCents: 10000,
            lineTotalCents: 10000
          }
        ]
      }
    }
  });

  // V11-7 ERP status slice: one succeeded synthetic sync job (keeps the
  // overview erp queue count at 0) plus one service account for the
  // read-only summary card. All fields are synthetic.
  // P2 customer management: one synthetic CRM contact for the stage edit.
  await prisma.crmContact.upsert({
    where: { email: "synthetic-contact@vanstro.test" },
    update: {},
    create: {
      email: "synthetic-contact@vanstro.test",
      firstName: "Synthetic",
      lastName: "Contact",
      stage: "registered",
      source: "registration"
    }
  });

  const erpJob = await prisma.erpSyncJob.create({
    data: {
      type: "customer_sync",
      status: "succeeded",
      payload: { synthetic: true },
      attemptCount: 1,
      attempts: { create: [{ success: true }] }
    }
  });
  const cliAccessPermission = await prisma.permission.findUniqueOrThrow({ where: { key: "cli.access" } });
  const erpRetryPermission = await prisma.permission.findUniqueOrThrow({ where: { key: "erp.sync.retry" } });
  const machineRole = await prisma.role.create({
    data: {
      key: "v11-machine-admin",
      name: "V11 Machine Admin",
      rolePermissions: { create: [{ permissionId: cliAccessPermission.id }, { permissionId: erpRetryPermission.id }] }
    }
  });
  const serviceAccount = await prisma.serviceAccount.create({
    data: {
      key: "synthetic-v11",
      name: "Synthetic V11",
      status: "active",
      environment: "development",
      tokens: { create: [{ tokenHash: "synthetic-token-hash-" + randomUUID(), name: "v11-synthetic-token" }] }
    }
  });
  // Bind the machine role through the join table directly — the generated
  // Prisma client relation name for ServiceAccount->ServiceAccountRole has
  // drifted between schema revisions; the physical table is authoritative.
  await prisma.$executeRaw`INSERT INTO service_account_roles (id, "serviceAccountId", "roleId", "createdAt")
    VALUES (${randomUUID()}, ${serviceAccount.id}, ${machineRole.id}, now()) ON CONFLICT DO NOTHING`;

  // V11-8 build certification: the disposable catalog must match the
  // committed mb01 catalog (the SEO route gate asserts exact equality of
  // exported product pages) plus the featured-8 contract (HOME_FEATURED_SKUS)
  // so the production build can static-generate homepage/product pages.
  const mb01Path = process.env.V11_MB01_CATALOG_PATH;
  if (!mb01Path) throw new Error("V11_MB01_CATALOG_PATH must point at mb01-products.ts");
  const mb01Source = readFileSync(mb01Path, "utf8");
  const mb01Products = [...mb01Source.matchAll(/"slug":\s*"([^"]+)",\s*\n\s*"sku":\s*"([^"]+)",[\s\S]*?"name":\s*"([^"]+)",[\s\S]*?"price":\s*\{\s*"amount":\s*(\d+(?:\.\d+)?),/g)]
    .map((match) => ({ slug: match[1], sku: match[2], name: match[3], priceCents: Math.round(Number(match[4]) * 100) }));
  if (mb01Products.length < 50) throw new Error(`mb01 catalog parse yielded too few products: ${mb01Products.length}`);
  const cabinetCategory = await prisma.category.upsert({
    where: { slug: "cabinets" },
    update: {},
    create: { slug: "cabinets", name: "Cabinets" }
  });
  // The three db:seed products are not part of the mb01 catalog the SEO
  // route gate expects; drop them so their SKUs do not collide with mb01
  // rows and no extra product pages appear in the static export.
  await prisma.product.deleteMany({
    where: { slug: { in: ["base-cabinet-b33", "bath-vanity-v30", "primed-mdf-baseboard"] } }
  });
  for (const product of mb01Products) {
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        categoryId: cabinetCategory.id,
        status: "active",
        skus: { create: { skuCode: product.sku, name: product.name } }
      }
    });
    // Every product must carry at least one asset: the cart payload contract
    // (validateCartProduct) requires a non-empty images array and formatCart
    // maps product_assets -> images, so an asset-less fixture product makes
    // every cart read fail validation and renders checkout as an error panel.
    await prisma.productAsset.upsert({
      where: { productId_url: { productId: created.id, url: `/assets/products/placeholder-${product.sku}.jpg` } },
      update: {},
      create: { productId: created.id, url: `/assets/products/placeholder-${product.sku}.jpg`, altText: product.name, kind: "image", sortOrder: 0 }
    });
    // Every mb01 product carries its committed catalog price: create an
    // active CAD price row for the primary SKU so the storefront never
    // renders a zero price (the release gate asserts 0 $0.00 artifacts).
    const sku = await prisma.platformSku.findUnique({ where: { skuCode: product.sku } });
    if (sku && Number.isFinite(product.priceCents) && product.priceCents > 0) {
      await prisma.price.upsert({
        where: { key: `v11-mb01-${sku.id}` },
        update: {},
        create: { key: `v11-mb01-${sku.id}`, skuId: sku.id, currency: "CAD", amountCents: product.priceCents, status: "active" }
      });
    }
  }
  // P1 price editing needs a price row on a SKU: give the first mb01 product
  // an active CAD price so the edit drawer shows the save-price control.
  // The products list sorts newest first; give the newest SKU's product the
  // price row so the first list row shows the save-price control.
  const newestSku = await prisma.platformSku.findFirst({ orderBy: { createdAt: "desc" } });
  if (newestSku) {
    await prisma.price.upsert({
      where: { key: `v11-r1-p1-${newestSku.id}` },
      update: {},
      create: { key: `v11-r1-p1-${newestSku.id}`, skuId: newestSku.id, currency: "CAD", amountCents: 10000, status: "active" }
    });
    // P1 inventory editing needs a dealer location + snapshot on that SKU.
    const dealer = await prisma.dealer.upsert({
      where: { code: "v11-r1-p1-dealer" },
      update: {},
      create: { code: "v11-r1-p1-dealer", name: "V11 R1 P1 Dealer", status: "active" }
    });
    let location = await prisma.dealerLocation.findFirst({ where: { code: "v11-r1-p1-loc" } });
    if (!location) {
      location = await prisma.dealerLocation.create({
        data: { dealerId: dealer.id, code: "v11-r1-p1-loc", name: "V11 R1 P1 Location", country: "CA" }
      });
    }
    await prisma.inventorySnapshot.upsert({
      where: { skuId_dealerLocationId: { skuId: newestSku.id, dealerLocationId: location.id } },
      update: {},
      create: { skuId: newestSku.id, dealerLocationId: location.id, quantityOnHand: 10 }
    });
  }
  console.log(JSON.stringify({
    admin: { email: adminEmail, id: admin.id },
    customer: { email: customerEmail },
    noDashAdmin: { email: noDashAdminEmail },
    partialAdmin: { email: partialAdminEmail, id: partialAdmin.id },
    reader: { email: readerEmail, id: reader.id },
    order: { id: order.id, status: order.status },
    erpJob: { id: erpJob.id, status: erpJob.status },
    serviceAccount: { id: serviceAccount.id, key: serviceAccount.key }
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
