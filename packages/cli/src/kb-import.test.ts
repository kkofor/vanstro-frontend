import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { importKnowledgeBase, prepareKnowledgeBase } from "./kb-import.js";

test("knowledge-base preparation excludes offsite, research, and AppleDouble files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-kb-"));
  await mkdir(join(dir, "vanstro-kb-offsite-pack"));
  await writeFile(join(dir, "vanstro-kb-offsite-pack", "internal.md"), "# Internal");
  await writeFile(join(dir, "00-external-public-research.md"), "# Research");
  await writeFile(join(dir, "._page.md"), "not markdown");
  await writeFile(join(dir, "article-en.md"), "# Public\nUseful support content.");
  const docs = await prepareKnowledgeBase(dir);
  assert.deepEqual(docs.map((doc) => doc.sourcePath), ["article-en.md"]);
});

test("drops ordering banners and one-city postal navigation while retaining article text", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-kb-"));
  await writeFile(join(dir, "policy-fr.md"), [
    "# Politique de retour", "Skip to main content",
    "Online ordering is available in participating service areas. La commande en ligne est offerte dans les zones desservies.",
    "Calgary T2G 2M3", "Saanich V8X", "Les retours admissibles sont acceptés sous conditions concrètes."
  ].join("\n"));
  await writeFile(join(dir, "warranty-cabinet-vanity-2026.md"), "# 12-Month Warranty\nWarranty coverage applies to cabinets and vanities.");
  const docs = await prepareKnowledgeBase(dir);
  const policy = docs.find((doc) => doc.sourcePath === "policy-fr.md")!;
  const text = policy.chunks.map((chunk) => chunk.text).join(" ");
  assert.doesNotMatch(text, /Online ordering is available in participating service areas/i);
  assert.doesNotMatch(text, /commande en ligne.*zones desservies/i);
  assert.doesNotMatch(text, /Calgary T2G 2M3|Saanich V8X/i);
  assert.match(text, /retours admissibles/);
  const warrantyDocs = docs.filter((doc) => doc.sourcePath.startsWith("warranty-cabinet-vanity-2026.md#"));
  assert.deepEqual(warrantyDocs.map((doc) => doc.sourcePath), [
    "warranty-cabinet-vanity-2026.md#en-CA",
    "warranty-cabinet-vanity-2026.md#fr-CA",
  ]);
  assert.deepEqual(warrantyDocs.map((doc) => doc.locale), ["en-CA", "fr-CA"]);
  assert.ok(warrantyDocs.every((doc) => doc.chunks.every((chunk) => chunk.text.startsWith("Warranty / Garantie — "))));
});
test("dry-run reports filtered prices and removed navigation without a database", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-kb-"));
  await writeFile(join(dir, "article-fr.md"), [
    "# Politique de retour", "Skip to main content", "Winnipeg Calgary Saanich Choose a local dealer",
    "Le prix est $123.45 et $9.00.", "Le contenu de la politique est ici."
  ].join("\n"));
  const summary = await importKnowledgeBase(dir, { dryRun: true });
  assert.equal(summary.documents, 1);
  assert.equal(summary.prices_filtered, 2);
  assert.ok(summary.nav_lines_removed >= 1);
  assert.equal(summary.skipped_unchanged, 0);
});

test("price replacements contain no digits and locale is inferred from filename", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-kb-"));
  await writeFile(join(dir, "guide-fr.md"), "# Guide\nPrix $42.00 selon la page.");
  const [doc] = await prepareKnowledgeBase(dir);
  assert.equal(doc?.locale, "fr-CA");
  assert.match(doc?.chunks.map((chunk) => chunk.text).join(" ") ?? "", /Prix selon la page produit/);
  assert.doesNotMatch(doc?.chunks.map((chunk) => chunk.text).join(" ") ?? "", /\$\d|42/);
});

test("infers locale from path only, never translated body text", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-kb-"));
  await writeFile(join(dir, "warranty-cabinet-vanity-2026.md"), "# Warranty\nGarantie et politique en français.");
  await writeFile(join(dir, "page-fr-return-policy.md"), "# Return policy\nEnglish body text.");
  await writeFile(join(dir, "article-en-pickup-and-delivery-options.md"), "# Pickup\nOptions disponibles en français.");
  const docs = await prepareKnowledgeBase(dir);
  assert.deepEqual(docs.map((doc) => doc.sourcePath), [
    "article-en-pickup-and-delivery-options.md",
    "page-fr-return-policy.md",
    "warranty-cabinet-vanity-2026.md#en-CA",
    "warranty-cabinet-vanity-2026.md#fr-CA",
  ]);
  assert.equal(docs.find((doc) => doc.sourcePath === "page-fr-return-policy.md")?.locale, "fr-CA");
  assert.equal(docs.find((doc) => doc.sourcePath === "article-en-pickup-and-delivery-options.md")?.locale, "en-CA");
  assert.deepEqual(
    docs.filter((doc) => doc.sourcePath.startsWith("warranty-cabinet-vanity-2026.md#")).map((doc) => doc.locale),
    ["en-CA", "fr-CA"],
  );
});

