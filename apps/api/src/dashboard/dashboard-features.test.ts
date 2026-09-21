import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { createApp } from "../app.js";
import { requireDashboardPermission, type DashboardEnv } from "./access.js";
import { createDashboardSystemRoutes } from "./system.js";

const app = createApp();

test("GET /dashboard/products/:id returns product detail for seeded SKU", async () => {
  const sku = await prisma.platformSku.findFirst({ where: { skuCode: "011090130" } });
  assert.ok(sku);
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local", password: process.env.SUPER_ADMIN_PASSWORD })
  });
  assert.equal(login.status, 200);
  const session = (await login.json()) as { data: { accessToken: string } };
  const response = await app.request(`/api/v1/dashboard/products/${sku!.productId}`, {
    headers: { authorization: `Bearer ${session.data.accessToken}` }
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: { manufacturerPartNumber?: string; storefront?: { detail?: { manufacturerPartNumber?: string } } } };
  assert.equal(body.data.manufacturerPartNumber ?? body.data.storefront?.detail?.manufacturerPartNumber, "B33-WHT");
});

test("GET /dashboard/overview returns real aggregate counts", async () => {
  const observedCounts: Array<{ products: number; categories: number }> = [];
  const overviewApp = new Hono<DashboardEnv>();
  overviewApp.use("/api/v1/dashboard/*", requireDashboardPermission);
  overviewApp.route("/api/v1", createDashboardSystemRoutes((counts) => {
    observedCounts.push(counts);
  }));
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local", password: process.env.SUPER_ADMIN_PASSWORD })
  });
  assert.equal(login.status, 200);
  const session = (await login.json()) as { data: { accessToken: string } };
  const response = await overviewApp.request("/api/v1/dashboard/overview", {
    headers: { authorization: `Bearer ${session.data.accessToken}` }
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    data: { counts: { products: number; categories: number; users: number }; commerce: { quantityOnHand: number }; queues: { alerts: number } }
  };
  assert.equal(observedCounts.length, 1);
  assert.equal(body.data.counts.products, observedCounts[0]!.products);
  assert.equal(body.data.counts.categories, observedCounts[0]!.categories);
  const productionResponse = await app.request("/api/v1/dashboard/overview", {
    headers: { authorization: `Bearer ${session.data.accessToken}` }
  });
  assert.equal(productionResponse.status, 200);
  const productionBody = (await productionResponse.json()) as {
    data: { counts: { products: number; categories: number } }
  };
  assert.ok(Number.isInteger(productionBody.data.counts.products));
  assert.ok(productionBody.data.counts.products >= 0);
  assert.ok(Number.isInteger(productionBody.data.counts.categories));
  assert.ok(productionBody.data.counts.categories >= 0);
  assert.ok(body.data.counts.users >= 1);
  assert.ok(body.data.commerce.quantityOnHand >= 0);
  assert.ok(body.data.queues.alerts >= 0);
});

test("GET /dealers/lookup matches Winnipeg FSA", async () => {
  const response = await app.request("/api/v1/dealers/lookup?postalCode=R3C%201A1");
  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: Array<{ location: { name: string } }>; meta: { matched: number } };
  assert.ok(body.meta.matched >= 1);
  assert.ok(body.data.some((entry) => entry.location.name.includes("Winnipeg")));
});

test("POST /support/handoffs creates a handoff record", async () => {
  const response = await app.request("/api/v1/support/handoffs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      channel: "ai",
      sourcePath: "/products",
      transcript: [{ role: "user", message: "Need help", createdAt: new Date().toISOString() }]
    })
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { data: { id: string; status: string } };
  assert.equal(body.data.status, "new");

  const outbox = await prisma.emailOutbox.findFirst({
    where: { templateKey: "support_handoff_received", payload: { path: ["handoffId"], equals: body.data.id } }
  });
  assert.ok(outbox);

  await prisma.emailOutbox.deleteMany({ where: { templateKey: "support_handoff_received", payload: { path: ["handoffId"], equals: body.data.id } } });
  await prisma.supportHandoff.delete({ where: { id: body.data.id } });
});
