import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const suffix = randomBytes(4).toString("hex");
const databaseName = `vanstro_smoke_e2e_${suffix}`;
const mailpitDatabase = join(tmpdir(), `vanstro-mailpit-${suffix}.db`);
const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) throw new Error("DATABASE_URL is required to locate the local PostgreSQL server.");
const source = new URL(sourceDatabaseUrl);
const databaseUrl = new URL(sourceDatabaseUrl);
databaseUrl.pathname = `/${databaseName}`;
databaseUrl.search = "?schema=public";
const psqlUrl = new URL(databaseUrl);
psqlUrl.search = "";
const baseEnv = {
  ...process.env,
  PATH: `/opt/homebrew/opt/node@22/bin:${process.env.PATH}`,
  DATABASE_URL: databaseUrl.toString(),
  VANSTRO_RUNTIME_MODE: "test",
  PAYMENT_CALLBACK_SECRET: "local-staging-payment-secret",
  ERP_WEBHOOK_SECRET: "local-staging-erp-webhook-secret",
  SUPER_ADMIN_EMAIL: "admin@vanstro.test",
  SUPER_ADMIN_PASSWORD: "local-staging-admin-password",
  ALLOW_DEMO_SEED: "true",
  ALLOW_DESTRUCTIVE_SMOKE: "true"
};
const children: ReturnType<typeof spawn>[] = [];
function run(command: string, args: string[], env = baseEnv) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}
function start(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
  children.push(child);
  return child;
}
async function waitFor(url: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${url} did not become ready.`);
}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:4001/api/v1${path}`, {
    ...init,
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

try {
  const dbArgs = ["-h", source.hostname, "-p", source.port || "5432", "-U", decodeURIComponent(source.username)];
  const pgEnv = { ...process.env, PGPASSWORD: decodeURIComponent(source.password) };
  spawnSync("dropdb", ["--if-exists", ...dbArgs, databaseName], { env: pgEnv });
  run("createdb", [...dbArgs, databaseName], pgEnv);
  run("pnpm", ["--filter", "@vanstro/db", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]);
  run("pnpm", ["--filter", "@vanstro/db", "db:seed"]);
  run("pnpm", ["build:backend"]);

  start("mailpit", ["--smtp", "127.0.0.1:1026", "--listen", "127.0.0.1:8026", "--database", mailpitDatabase], baseEnv);
  start("pnpm", ["--filter", "@vanstro/erp-mock", "start"], { ...baseEnv, ERP_MOCK_PORT: "4101", ERP_MOCK_SYSTEM: "configured-erp", ERP_MOCK_AUTO_WEBHOOK: "true", ERP_MOCK_API_WEBHOOK_URL: "http://127.0.0.1:4001/api/v1/integrations/erp/webhooks/order-status" });
  start("node", ["apps/api/dist/index.js"], { ...baseEnv, API_HOST: "127.0.0.1", API_PORT: "4001", ENABLE_PAYMENT_SIMULATION: "true" });
  start("node", ["apps/worker/dist/index.js"], { ...baseEnv, WORKER_POLL_INTERVAL_MS: "1000", SMTP_HOST: "127.0.0.1", SMTP_PORT: "1026", SMTP_USER: "test", SMTP_PASSWORD: "test-password", SMTP_FROM: "VanStro Test <test@vanstro.local>", SMTP_REQUIRE_TLS: "false", ERP_API_BASE_URL: "http://127.0.0.1:4101", ERP_SERVICE_TOKEN: "local-staging-erp-service-token", VANSTRO_API_BASE_URL: "http://127.0.0.1:4001/api/v1" });
  await Promise.all([waitFor("http://127.0.0.1:4001/health/ready"), waitFor("http://127.0.0.1:4101/health"), waitFor("http://127.0.0.1:8026/api/v1/info")]);

  const fixture = spawnSync("psql", [psqlUrl.toString(), "-Atc", `SELECT p.id || '|' || dl.id FROM products p JOIN platform_skus s ON s.\"productId\"=p.id JOIN inventory_snapshots i ON i.\"skuId\"=s.id JOIN dealer_locations dl ON dl.id=i.\"dealerLocationId\" WHERE p.status='active' AND s.status='active' AND i.\"quantityOnHand\">i.\"quantityReserved\" LIMIT 1`], { env: pgEnv, encoding: "utf8" });
  if (fixture.status !== 0) throw new Error(fixture.stderr);
  const [productId, dealerLocationId] = fixture.stdout.trim().split("|");
  const cart = await request("/cart");
  const cartToken = cart.meta.cartToken;
  await request("/cart/items", { method: "POST", headers: { "x-cart-token": cartToken }, body: JSON.stringify({ productId, quantity: 1 }) });
  const checkout = await request("/checkout/session", { method: "POST", headers: { "x-cart-token": cartToken, "idempotency-key": randomUUID() }, body: JSON.stringify({ firstName: "Stage", lastName: "Buyer", email: `stage-${suffix}@vanstro.test`, phone: "2045550100", fulfillment: "pickup", paymentMethod: "cash", dealerLocationId }) });
  const simulation = await request("/payments/simulate", { method: "POST", body: JSON.stringify({ sessionId: checkout.data.id }) });
  const paid = await request("/payments/callback", { method: "POST", headers: { "x-payment-signature": simulation.data.signature }, body: JSON.stringify({ sessionId: checkout.data.id, status: "paid", providerPaymentId: simulation.data.providerPaymentId }) });
  await request("/payments/callback", { method: "POST", headers: { "x-payment-signature": simulation.data.signature }, body: JSON.stringify({ sessionId: checkout.data.id, status: "paid", providerPaymentId: simulation.data.providerPaymentId }) });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const order = await request(`/orders/${paid.data.id}?token=${encodeURIComponent(checkout.data.guestOrderToken)}`);
  if (order.data.status !== "processing") throw new Error(`Expected processing, got ${order.data.status}`);
  const messages = await fetch("http://127.0.0.1:8026/api/v1/messages").then((response) => response.json()) as { total: number };
  if (messages.total < 1) throw new Error("No email reached Mailpit.");
  console.log(JSON.stringify({ ok: true, orderId: paid.data.id, status: order.data.status, mailCount: messages.total }, null, 2));
} finally {
  for (const child of children.reverse()) child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 500));
  const dbArgs = ["-h", source.hostname, "-p", source.port || "5432", "-U", decodeURIComponent(source.username)];
  spawnSync("dropdb", ["--if-exists", ...dbArgs, databaseName], { env: { ...process.env, PGPASSWORD: decodeURIComponent(source.password) } });
  rmSync(mailpitDatabase, { force: true });
  rmSync(`${mailpitDatabase}-shm`, { force: true });
  rmSync(`${mailpitDatabase}-wal`, { force: true });
}
