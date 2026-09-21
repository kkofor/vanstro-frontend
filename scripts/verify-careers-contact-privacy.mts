import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFile(`${root}/${path}`, "utf8");

const [topicField, contactPage, privacyPolicy, formEndpoint, contract, apiRoute, schema, migration, legalPages] = await Promise.all([
  read("src/components/contact/ContactTopicField.tsx"),
  read("src/app/contact/page.tsx"),
  read("src/content/legalPages.ts"),
  read("src/lib/api/form-endpoints.ts"),
  read("src/lib/api/dashboard-contract.ts"),
  read("apps/api/src/routes/submissions.ts"),
  read("packages/db/prisma/schema.prisma"),
  read("packages/db/prisma/migrations/20260725143000_contact_lead_locale/migration.sql"),
  read("src/content/legalPages.ts")
]);

assert.match(contactPage, /<ContactTopicField locale=\{locale\} \/>/);
assert.match(topicField, /new URLSearchParams\(window\.location\.search\)/);
assert.match(topicField, /requestedTopic === CAREERS_TOPIC/);
assert.match(topicField, /topic === CAREERS_TOPIC/);
assert.match(topicField, /hidden=\{topic !== CAREERS_TOPIC\}/);
assert.match(topicField, /For a careers inquiry, VanStro uses the information you submit to evaluate your inquiry, communicate with you, and make recruitment or engagement decisions/);
assert.match(topicField, /We retain it during that process and afterward only as necessary for the purposes for which it was collected, to meet legal and contractual obligations, and to resolve disputes/);
assert.match(topicField, /Pour une demande relative aux carrières, VanStro utilise les renseignements transmis pour évaluer votre demande, communiquer avec vous et prendre des décisions de recrutement ou d’engagement/);
assert.match(topicField, /Nous les conservons pendant ce processus, puis seulement dans la mesure nécessaire aux fins pour lesquelles ils ont été recueillis, au respect de nos obligations légales et contractuelles et au règlement des différends/);
assert.match(topicField, /localeHref\("\/privacy", locale\)/);
assert.doesNotMatch(topicField, /\b(?:30|60|90|180|365)\s+(?:day|days|jour|jours|month|months|mois|year|years|an|ans|année|années)\b/i);
assert.match(legalPages, /primaryCta: \{ label: "Contact VanStro", href: "\/contact\?topic=careers" \}/);
assert.match(legalPages, /primaryCta: \{ label: "Communiquer avec VanStro", href: "\/contact\?topic=careers" \}/);

for (const marker of [
  "BUSINESS/COUNSEL CONFIRMATION REQUIRED: Confirm whether applicant data is",
  "CONFIRMATION PAR L’ENTREPRISE ET LE CONSEILLER JURIDIQUE REQUISE : confirmer"
]) assert.match(privacyPolicy, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(privacyPolicy, /Applicant records are retained for the recruitment or engagement process/);
assert.match(privacyPolicy, /Les dossiers de candidature sont conservés pendant le processus de recrutement ou d’engagement/);

assert.match(formEndpoint, /topic,\s*\n\s*message:/);
assert.match(formEndpoint, /locale,\s*\n\s*sourcePath/);
assert.match(contract, /topic:[\s\S]*?"careers"[\s\S]*?locale: Locale/);
assert.match(apiRoute, /const topic = stringValue\(body, "topic"\)/);
assert.match(apiRoute, /const locale = stringValue\(body, "locale"\)/);
assert.match(apiRoute, /topic: validatedTopic/);
assert.match(apiRoute, /message: validatedMessage,\s*\n\s*locale,/);
assert.match(schema, /model ContactLead \{[\s\S]*?topic\s+String[\s\S]*?locale\s+String\?/);
assert.match(migration, /ALTER TABLE "contact_leads" ADD COLUMN "locale" TEXT;/);

const htmlDirectory = process.argv[2];
if (htmlDirectory) {
  const [englishHtml, frenchHtml] = await Promise.all([
    readFile(`${htmlDirectory}/contact/index.html`, "utf8"),
    readFile(`${htmlDirectory}/fr/contact/index.html`, "utf8")
  ]);
  assert.match(englishHtml, /For a careers inquiry, VanStro uses the information you submit/);
  assert.match(englishHtml, /href="\/privacy\/?"/);
  assert.match(frenchHtml, /Pour une demande relative aux carrières, VanStro utilise les renseignements transmis/);
  assert.match(frenchHtml, /href="\/fr\/privacy\/?"/);
}

console.log(`Verified careers/contact privacy alignment${htmlDirectory ? " in source and exported HTML" : " in source"}.`);
