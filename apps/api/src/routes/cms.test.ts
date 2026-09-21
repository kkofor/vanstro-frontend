import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app.js";

const app = createApp();

test("GET /navigation returns published locale payload", async () => {
  const response = await app.request("/api/v1/navigation?locale=fr-CA");
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    data: { primaryItems: Array<{ label: string }> };
    meta: { locale: string };
  };
  assert.equal(body.meta.locale, "fr-CA");
  assert.ok(Array.isArray(body.data.primaryItems));
  assert.ok(body.data.primaryItems.some((item) => item.label === "Produits"));
});

test("GET /home/banners only returns published CMS banners", async () => {
  const response = await app.request("/api/v1/home/banners?locale=en-CA");
  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: Array<{ id: string; title: string }> };
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length >= 1);
  assert.ok(body.data.every((banner) => typeof banner.id === "string" && typeof banner.title === "string"));
});

test("GET /legal-pages/:slug returns 404 for unknown slug", async () => {
  const response = await app.request("/api/v1/legal-pages/does-not-exist?locale=en-CA");
  assert.equal(response.status, 404);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "COMMERCE_NOT_FOUND");
});

test("GET /articles returns published articles for locale", async () => {
  const response = await app.request("/api/v1/articles?locale=en-CA");
  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: Array<{ slug: string }> };
  assert.ok(body.data.some((article) => article.slug === "choosing-kitchen-cabinets"));
});

test("GET /footer falls back to en-CA shape when locale is unsupported", async () => {
  const response = await app.request("/api/v1/footer?locale=zh-CN");
  assert.equal(response.status, 200);
  const body = (await response.json()) as { meta: { locale: string }; data: { legalLinks: unknown[] } };
  assert.equal(body.meta.locale, "en-CA");
  assert.ok(Array.isArray(body.data.legalLinks));
});
