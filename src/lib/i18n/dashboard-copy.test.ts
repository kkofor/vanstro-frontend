import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { getDashboardCopy, getDashboardF0Copy, type DashboardCopy } from "./dashboard-copy.ts";
import { localeFromPathname, type SiteLocale } from "./locale.ts";

type CopyLeaf = string | ((...args: unknown[]) => string);

function flattenCopy(value: unknown, prefix = ""): Array<[string, CopyLeaf]> {
  if (typeof value === "string" || typeof value === "function") return [[prefix, value as CopyLeaf]];
  assert.ok(value && typeof value === "object", `Unexpected copy value at ${prefix}`);
  return Object.entries(value).flatMap(([key, child]) => flattenCopy(child, prefix ? `${prefix}.${key}` : key));
}

function copyShape(copy: DashboardCopy): string[] {
  return flattenCopy(copy).map(([path, value]) => `${path}:${typeof value}`).sort();
}

function legacyFingerprint(copy: DashboardCopy): string {
  const functionArguments: Record<string, unknown[]> = {
    "errors.requestFailedWith": [418],
    "errors.loadPathFailed": ["/dashboard/products"],
    "hero.signedInAs": ["admin@example.com"],
    "pagination.showing": [2, 7, 123]
  };
  const snapshot = flattenCopy(copy)
    .map(([path, value]) => [path, typeof value === "function" ? value(...(functionArguments[path] ?? [])) : value])
    .sort(([left], [right]) => left.localeCompare(right));
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

test("Simplified Chinese F0 copy implements the complete DashboardCopy contract", () => {
  const chinese = getDashboardF0Copy();
  const chineseShape = new Set(copyShape(chinese));
  for (const key of copyShape(getDashboardCopy("en-CA"))) assert.ok(chineseShape.has(key));
  assert.equal(flattenCopy(chinese).length, 464);
  assert.equal(chinese.errors.requestFailedWith(418), "请求失败，状态码为 418");
  assert.equal(chinese.errors.loadPathFailed("/dashboard/products"), "无法加载 /dashboard/products");
  assert.equal(chinese.hero.signedInAs("admin@example.com"), "当前登录账户：admin@example.com。");
  assert.equal(chinese.pagination.showing(2, 7, 123), "第 2 页，共 7 页（合计 123 条）");
  assert.deepEqual(
    ["paid", "pickup", "processing", "fulfilled", "cancelled", "failed", "retry_wait"].map((key) => chinese.values[key as keyof typeof chinese.values]),
    ["已支付", "自提", "处理中", "已履约", "已取消", "失败", "等待重试"]
  );

  const rendered = flattenCopy(chinese).filter(([, value]) => typeof value === "string").map(([, value]) => value).join("\n");
  for (const untranslated of ["No records yet.", "Create product", "Update status", "Last error", "Content management"]) {
    assert.doesNotMatch(rendered, new RegExp(untranslated.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

const publicSiteLocales = {
  "en-CA": true,
  "fr-CA": true
} satisfies Record<SiteLocale, true>;

test("Simplified Chinese F0 copy is internal, not a third public SiteLocale", () => {
  assert.deepEqual(Object.keys(publicSiteLocales), ["en-CA", "fr-CA"]);
  assert.equal(localeFromPathname("/zh/dashboard"), "en-CA");
  assert.equal(localeFromPathname("/fr/dashboard"), "fr-CA");
  const f0 = getDashboardF0Copy();
  assert.ok(!Object.keys(publicSiteLocales).some((locale) => f0 === getDashboardCopy(locale as SiteLocale)));
  assert.equal(f0.tabs.overview, "概览");
});

test("V11-R1 P0-5: product JSON batch-import copy is gone; the ERP sync surface copy exists in every locale", () => {
  const en = getDashboardCopy("en-CA");
  const fr = getDashboardCopy("fr-CA");
  const zh = getDashboardF0Copy();
  for (const copy of [en, fr, zh]) {
    assert.ok(!("batch" in copy.tabs), "batch tab label must be removed");
    assert.ok(!("syncFromErp" in copy.products), "bare sync button label must be removed");
    assert.equal(copy.erpSync.title.length > 0, true);
    assert.equal(copy.erpSync.start.length > 0, true);
    assert.equal(copy.erpSync.retryLastSync.length > 0, true);
    assert.equal(copy.erpSync.imported.length > 0, true);
    assert.equal(copy.erpSync.updated.length > 0, true);
    assert.equal(copy.erpSync.skipped.length > 0, true);
    assert.equal(copy.erpSync.failedCount.length > 0, true);
    assert.equal(copy.erpSync.conflictNote.length > 0, true);
    assert.equal(copy.erpSync.failureReasons.length > 0, true);
    assert.equal(copy.erpSync.awaitingIntegration.length > 0, true);
  }
  assert.equal(zh.erpSync.title, "从 ERP 同步商品");
  assert.equal(en.erpSync.title, "Sync products from ERP");
  assert.equal(fr.erpSync.title, "Synchroniser les produits depuis l’ERP");
});

test("legacy English and French Dashboard copy remain byte-stable", () => {
  assert.equal(getDashboardCopy("en-CA").values.pending_payment, "Pending payment");
  assert.equal(getDashboardCopy("en-CA").values.payment_expired, "Payment expired");
  assert.equal(getDashboardCopy("fr-CA").values.pending_payment, "Paiement en attente");
  assert.equal(getDashboardCopy("fr-CA").values.payment_expired, "Paiement expiré");
  assert.equal(getDashboardF0Copy().values.pending_payment, "待付款");
  assert.equal(getDashboardF0Copy().values.payment_expired, "付款已过期");
  assert.deepEqual(getDashboardCopy("en-CA").orders.paymentMethod, {
    card: "Online card", pos: "In-store card", cash: "In-store cash"
  });
  assert.deepEqual(getDashboardCopy("fr-CA").orders.paymentMethod, {
    card: "Carte en ligne", pos: "Carte en magasin", cash: "Espèces en magasin"
  });
  assert.deepEqual(getDashboardF0Copy().orders.paymentMethod, {
    card: "在线卡", pos: "到店刷卡", cash: "到店现金"
  });
  assert.match(getDashboardCopy("en-CA").orders.copy, /pending in-store reservations/);
  assert.match(getDashboardF0Copy().orders.copy, /待处理的到店预留订单/);

  assert.equal(legacyFingerprint(getDashboardCopy("en-CA")), "5672f3c5305e664db9dc1c6c460d3ce5622544ca5a2359cc3983cf6e3e5a4b25");
  assert.equal(legacyFingerprint(getDashboardCopy("fr-CA")), "e50124424ab9d094c18a60a6e5c4ccb21b9d5133afd0efdf14190c50fc511fed");
  assert.strictEqual(getDashboardCopy("en-CA"), getDashboardCopy("en-CA"));
  assert.strictEqual(getDashboardCopy("fr-CA"), getDashboardCopy("fr-CA"));
  assert.equal(getDashboardCopy("en-CA").values.active, "Active");
  assert.equal(getDashboardCopy("fr-CA").values.active, "Actif");
});
