import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { careersContent, CAREERS_EMAIL } from "../src/content/careers.ts";
import {
  getProductResourceDocuments,
  getResourceCenterHref,
  resourceCategories,
  resourceDocuments
} from "../src/content/resources.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
type ApprovedPdf = { bytes: number; pages: number; sha256: string };
const manifest = JSON.parse(
  await readFile(`${root}/qa/fixtures/canonical-pdf-manifest.json`, "utf8")
) as { files: Record<string, ApprovedPdf> };
const approvedPdfs = manifest.files;

const roleSlugs = [
  "business-operations-coordinator",
  "human-resources-coordinator-recruitment-specialist",
  "business-development-representative"
];

const expectedRoleFacts = {
  "en-CA": [
    ["Business Operations Coordinator", "Winnipeg, Manitoba", "In person", "Full-time or part-time", 4],
    ["Human Resources Coordinator / Recruitment Specialist", "Winnipeg, Manitoba", "In person", undefined, 3],
    ["Business Development Representative", "Winnipeg and surrounding areas", "Office and field-based", "Full-time or part-time, permanent", 2]
  ],
  "fr-CA": [
    ["Coordonnateur ou coordonnatrice des opérations commerciales", "Winnipeg (Manitoba)", "En personne", "Temps plein ou temps partiel", 4],
    ["Coordonnateur ou coordonnatrice des ressources humaines / Spécialiste du recrutement", "Winnipeg (Manitoba)", "En personne", undefined, 3],
    ["Représentant ou représentante du développement des affaires", "Winnipeg et les environs", "Travail au bureau et sur le terrain", "Temps plein ou temps partiel, poste permanent", 2]
  ]
} as const;

function filenames() {
  return resourceDocuments.map(({ href }) => href.split("/").at(-1) as string);
}

test("Careers exposes exactly three fact-aligned roles in both locales", () => {
  assert.equal(CAREERS_EMAIL, "hr@vanstro.ca");

  for (const locale of ["en-CA", "fr-CA"] as const) {
    const roles = careersContent[locale].roles;
    assert.equal(roles.length, 3);
    assert.deepEqual(roles.map(({ slug }) => slug), roleSlugs);
    roles.forEach((role, index) => {
      const [title, location, workArrangement, employmentType, preferredCount] = expectedRoleFacts[locale][index];
      assert.equal(role.title, title);
      assert.equal(role.location, location);
      assert.equal(role.workArrangement, workArrangement);
      assert.equal(role.employmentType, employmentType);
      assert.equal(role.requirements.length, 4);
      assert.equal(role.responsibilities.length, 5);
      assert.equal(role.preferred?.length, preferredCount);
      assert.match(role.subject, locale === "fr-CA" ? /^Candidature — / : /^Application — /);
    });
  }

  const english = JSON.stringify(careersContent["en-CA"].roles);
  assert.match(english, /English and Chinese/);
  assert.match(english, /French language proficiency/);
  assert.match(english, /Excel.*Word.*Outlook.*Teams.*SharePoint.*OneDrive/);
  assert.match(english, /POS.*CRM.*Microsoft 365.*SKU/);
  assert.match(english, /Indeed or LinkedIn/);
  assert.match(english, /Prairie Provinces/);
  assert.match(english, /Legal entitlement to work in Canada/);
  assert.match(english, /valid Canadian driver’s licence and reliable transportation/);
});

test("Careers pages use canonical locale data and reduced-motion navigation", async () => {
  const [englishPage, frenchPage, board] = await Promise.all([
    readFile(`${root}/src/app/careers/page.tsx`, "utf8"),
    readFile(`${root}/src/app/fr/careers/page.tsx`, "utf8"),
    readFile(`${root}/src/components/careers/CareersBoard.tsx`, "utf8")
  ]);
  assert.match(englishPage, /careersContent\["en-CA"\]/);
  assert.match(frenchPage, /careersContent\["fr-CA"\]/);
  assert.match(englishPage, /<CareersBoard content=\{content\}/);
  assert.match(frenchPage, /<CareersBoard content=\{content\}/);
  assert.match(board, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(board, /behavior: reduceMotion \? "auto" : "smooth"/);
  assert.doesNotMatch(board, /compensation/i);
});

test("Resource Center has the exact 2/8/1 local document inventory", async () => {
  assert.equal(resourceDocuments.length, 11);
  assert.deepEqual(resourceCategories.map(({ id }) => id), ["catalog", "installation", "warranty"]);
  assert.deepEqual(
    Object.fromEntries(resourceCategories.map(({ id }) => [id, resourceDocuments.filter((document) => document.category === id).length])),
    { catalog: 2, installation: 8, warranty: 1 }
  );
  assert.equal(new Set(resourceDocuments.map(({ id }) => id)).size, 11);
  assert.equal(new Set(resourceDocuments.map(({ href }) => href)).size, 11);
  assert.deepEqual([...filenames()].sort(), Object.keys(approvedPdfs).sort());

  const localPdfs = (await readdir(`${root}/public/resources`)).filter((file) => file.endsWith(".pdf")).sort();
  assert.deepEqual(localPdfs, Object.keys(approvedPdfs).sort());

  for (const document of resourceDocuments) {
    const filename = document.href.split("/").at(-1) as keyof typeof approvedPdfs;
    const expected = approvedPdfs[filename];
    assert.ok(expected, `Missing approved manifest entry for ${filename}`);
    assert.equal(document.href, `/resources/${filename}`);
    assert.equal(document.pages, expected.pages);
    assert.equal(getResourceCenterHref(document.id), `/articles/#resource-${document.id}`);
    const path = `${root}/public/resources/${filename}`;
    assert.equal((await stat(path)).size, expected.bytes);
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256);
  }
});

test("Product document links resolve to canonical Resource Center anchors", () => {
  const vanity = getProductResourceDocuments({ sku: "023021211", category: "Bathroom Vanities" });
  assert.deepEqual(vanity.map(({ type }) => type), ["installation", "specification", "warranty"]);
  const trim = getProductResourceDocuments({ sku: "TRIM-01", category: "Baseboards & Mouldings" });
  assert.deepEqual(trim.map(({ type }) => type), ["specification"]);
  const anchors = new Set(resourceDocuments.map(({ id }) => getResourceCenterHref(id)));
  for (const document of [...vanity, ...trim]) assert.ok(anchors.has(document.href));
});

test("About and Contact retain bilingual operational and careers privacy facts", async () => {
  const [about, frenchAbout, contact, frenchContact, topic, dealerContacts, fallbackDealers] = await Promise.all([
    readFile(`${root}/src/app/about/page.tsx`, "utf8"),
    readFile(`${root}/src/app/fr/about/page.tsx`, "utf8"),
    readFile(`${root}/src/app/contact/page.tsx`, "utf8"),
    readFile(`${root}/src/app/fr/contact/page.tsx`, "utf8"),
    readFile(`${root}/src/components/contact/ContactTopicField.tsx`, "utf8"),
    readFile(`${root}/src/lib/data/dealer-contacts.ts`, "utf8"),
    readFile(`${root}/src/lib/data/dealers.ts`, "utf8")
  ]);
  for (const marker of ["Headquartered in Winnipeg", "Order online. Fulfill locally.", "Local dealers operate independently", "Établie à Winnipeg", "Les détaillants locaux exercent leurs activités de façon indépendante"]) assert.match(about, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // contact page no longer carries dealer phone numbers; they moved to /dealers/map
  // (dealer facts asserted against src/lib/data/dealer-contacts.ts below)
  for (const marker of ["support@vanstro.ca", "Dealer routing", "Orientation vers un détaillant"]) assert.match(contact, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // F4-5 relocation: MB01 email and Winnipeg address moved to the dealer fallback data file.
  for (const marker of ["MB01@VANSTRO.CA", "856 Century St, Winnipeg, MB R3H 0M5"]) assert.match(dealerContacts, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // Dealers fallback file (API-failure path) carries MB01's fallback phone, which
  // disagrees with the API's real 204 221 8288 (tracked separately); guard it
  // here so the value cannot drift silently.
  for (const marker of ["+1 204 505 2288"]) assert.match(fallbackDealers, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(frenchAbout, /AboutPageContent locale="fr-CA"/);
  assert.match(frenchContact, /ContactPageContent locale="fr-CA"/);
  assert.match(topic, /const CAREERS_TOPIC = "careers"/);
  assert.match(topic, /For a careers inquiry/);
  assert.match(topic, /Pour une demande relative aux carrières/);
});
