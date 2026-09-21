#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(process.env.VANSTRO_QA_OUT_DIR ?? join(root, "out"));
const manifest = JSON.parse(await readFile(join(root, "qa/fixtures/canonical-pdf-manifest.json"), "utf8"));
const pdfNames = Object.keys(manifest.files).sort();
const roles = {
  en: [
    "Business Operations Coordinator",
    "Human Resources Coordinator / Recruitment Specialist",
    "Business Development Representative"
  ],
  fr: [
    "Coordonnateur ou coordonnatrice des opérations commerciales",
    "Coordonnateur ou coordonnatrice des ressources humaines / Spécialiste du recrutement",
    "Représentant ou représentante du développement des affaires"
  ]
};
const roleSlugs = [
  "business-operations-coordinator",
  "human-resources-coordinator-recruitment-specialist",
  "business-development-representative"
];
const planningGuides = [
  "how-to-measure-for-cabinets",
  "what-finishes-are-available",
  "pickup-and-delivery-options"
];

async function html(route) {
  return readFile(join(out, route, "index.html"), "utf8");
}

function pdfLinks(source) {
  return [...source.matchAll(/href="[^"#?]*\/resources\/([^"?#]+\.pdf)"/g)].map((match) => match[1]);
}

function assertIncludesAll(source, values, label) {
  for (const value of values) assert.ok(source.includes(value), `${label} is missing ${value}`);
}

function normalizedText(source) {
  return source.replace(/<!--.*?-->/gs, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

const [careersEn, careersFr, resourcesEn, resourcesFr, aboutEn, aboutFr, contactEn, contactFr, dealersMapEn, dealersMapFr] = await Promise.all([
  html("careers"), html("fr/careers"), html("articles"), html("fr/articles"),
  html("about"), html("fr/about"), html("contact"), html("fr/contact"),
  html("dealers/map"), html("fr/dealers/map")
]);

assertIncludesAll(careersEn, roles.en, "English Careers");
assertIncludesAll(careersFr, roles.fr, "French Careers");
assertIncludesAll(careersEn, roleSlugs, "English Careers role anchors");
assertIncludesAll(careersFr, roleSlugs, "French Careers role anchors");
assert.ok(normalizedText(careersEn).includes("3 open roles"));
assert.ok(normalizedText(careersFr).includes("3 postes à pourvoir"));
assert.ok(careersEn.includes("hr@vanstro.ca"));
assert.ok(careersFr.includes("hr@vanstro.ca"));
for (const title of roles.en) assert.ok(!careersFr.includes(title), `French Careers fell back to English: ${title}`);

for (const [source, locale] of [[resourcesEn, "English"], [resourcesFr, "French"]]) {
  const links = pdfLinks(source);
  assert.deepEqual([...new Set(links)].sort(), pdfNames, `${locale} Resource Center PDF inventory differs`);
  for (const filename of pdfNames) assert.equal(links.filter((link) => link === filename).length, 2, `${locale} ${filename} must have view and download links`);
  assertIncludesAll(source, planningGuides, `${locale} planning guides`);
}
assertIncludesAll(normalizedText(resourcesEn), ["Product catalogs", "Installation guides", "Warranty information", "2 files", "8 files", "1 file", "View PDF", "Download", "Before you install"], "English Resource Center");
assertIncludesAll(normalizedText(resourcesFr), ["Catalogues de produits", "Guides d’installation", "Renseignements sur la garantie", "2 fichiers", "8 fichiers", "1 fichier", "Voir le PDF", "Télécharger", "Avant l’installation"], "French Resource Center");
assert.ok(!resourcesFr.includes("Project documents, in one reliable place."), "French Resource Center fell back to English");

assertIncludesAll(aboutEn, ["Headquartered in Winnipeg", "Order online. Fulfill locally.", "Local dealers operate independently"], "English About");
assertIncludesAll(aboutFr, ["Établie à Winnipeg", "Les détaillants locaux exercent leurs activités de façon indépendante"], "French About");
assert.ok(!aboutFr.includes("Order online. Fulfill locally."), "French About fell back to English");
assertIncludesAll(contactEn, ["Dealer routing", "support@vanstro.ca"], "English Contact");
assertIncludesAll(contactFr, ["Orientation vers un détaillant", "support@vanstro.ca"], "French Contact");
assertIncludesAll(dealersMapEn, ["MB01@VANSTRO.CA"], "English Dealer map");
assertIncludesAll(dealersMapFr, ["MB01@VANSTRO.CA"], "French Dealer map");
assert.ok(!contactFr.includes("Contact VanStro"), "French Contact fell back to English");

const requiredRoutes = [
  "account", "account/login", "account/register", "account/profile", "account/addresses", "account/orders", "account/favorites",
  "account/forgot-password", "account/reset-password", "cart", "checkout", "checkout/payment", "dashboard",
  "fr/account", "fr/account/login", "fr/account/register", "fr/account/profile", "fr/account/addresses", "fr/account/orders", "fr/account/favorites",
  "fr/account/forgot-password", "fr/account/reset-password", "fr/cart", "fr/checkout", "fr/checkout/payment", "fr/dashboard"
];
const dashboardSections = ["applications", "audit", "categories", "content", "customers", "dealers", "email", "erp", "inventory", "leads", "operations", "orders", "payments", "pricing", "products", "promotions", "reviews", "roles", "support", "users"];
for (const section of dashboardSections) requiredRoutes.push(`dashboard/${section}`, `fr/dashboard/${section}`);
for (const route of requiredRoutes) await stat(join(out, route, "index.html"));

const exportedPdfs = (await readdir(join(out, "resources"))).filter((file) => file.endsWith(".pdf")).sort();
assert.deepEqual(exportedPdfs, pdfNames);
for (const filename of pdfNames) {
  const expected = manifest.files[filename];
  const publicPath = join(root, "public/resources", filename);
  const outputPath = join(out, "resources", filename);
  const [publicBytes, outputBytes] = await Promise.all([readFile(publicPath), readFile(outputPath)]);
  assert.equal(outputBytes.length, expected.bytes, `${filename} export byte size differs`);
  assert.equal(createHash("sha256").update(outputBytes).digest("hex"), expected.sha256, `${filename} export hash differs`);
  assert.deepEqual(outputBytes, publicBytes, `${filename} export differs from tracked source asset`);
}

console.log("Protected content artifacts passed: 8 protected HTML routes; 3 Careers roles per locale; 11 Resource PDFs per locale; category split 2/8/1; 11 exported PDFs matched bytes and SHA-256; 3 planning guides per locale; About/Contact bilingual markers; Account/Cart/Checkout/Payment/Dashboard route shells.");
