import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("./DealerAccessPage.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("./dealer-access.css", import.meta.url), "utf8");
const routes = await readFile(new URL("../../lib/i18n/routes.ts", import.meta.url), "utf8");
const header = await readFile(new URL("../layout/SiteHeader.tsx", import.meta.url), "utf8");
const footer = await readFile(new URL("../layout/SiteFooter.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../home/HomePage.tsx", import.meta.url), "utf8");
const homeFr = await readFile(new URL("../home/HomePageFr.tsx", import.meta.url), "utf8");
const homeV11 = await readFile(new URL("../home/HomePageV11.tsx", import.meta.url), "utf8");
const enRoute = await readFile(new URL("../../app/dealer-access/page.tsx", import.meta.url), "utf8");
const frRoute = await readFile(new URL("../../app/fr/dealer-access/page.tsx", import.meta.url), "utf8");

 test("dealer access exposes exactly three secure external system cards in approved order", () => {
  assert.deepEqual([...page.matchAll(/href: "(https:\/\/[^" ]+)"/g)].map((match) => match[1]), [
    "https://tools.vanstro.ca/",
    "https://crm.vanstro.ca/dealer/",
    "https://erp.vanstro.ca/"
  ]);
  assert.match(page, /data-system=\{card\.key\}/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /EN_CARDS/);
  assert.match(page, /FR_CARDS/);
});

test("dealer access title uses homepage H0 font-size formula without a mobile 44px override", () => {
  assert.match(css, /\.dealer-access-title \{[\s\S]*?font-size: 48px;/);
  assert.doesNotMatch(css, /\.dealer-access-title \{[^}]*font-size: 44px;/);
});

test("dealer access uses exact localized login titles and keeps support link content readable across interaction states", () => {
  assert.match(page, /title: "Dealer Portal"/);
  assert.match(page, /title: "Portail détaillant"/);
  assert.match(page, /supportAction: "Ask your VanStro contact"/);
  assert.match(page, /supportAction: "Joindre votre contact VanStro"/);
  assert.match(page, /buttonVariants\(\{ variant: "link", size: "sm" \}\).*dealer-access-support-link/);
  assert.match(css, /\.dealer-access-support-link\.vs-ui-button:hover,[\s\S]*?background: transparent;[\s\S]*?color: var\(--surface-brand\);/);
  assert.match(css, /\.dealer-access-support-link\.vs-ui-button:focus-visible/);
  assert.match(css, /\.dealer-access-support-link\.vs-ui-button > svg \{ color: currentColor; \}/);
});
test("hub route pair is static and private, with noindex metadata", () => {
  assert.match(routes, /en: "\/dealer-access", fr: "\/fr\/dealer-access", indexable: false/);
  assert.match(enRoute, /path: "\/dealer-access"/);
  assert.match(frRoute, /path: "\/fr\/dealer-access"/);
  assert.match(enRoute, /noIndex: true/);
  assert.match(frRoute, /noIndex: true/);
});

test("normal sign-in remains account login while partner links use the hub", () => {
  assert.match(header, /localizeHref\("\/account\/login"\)/);
  assert.match(header, /localizeHref\("\/dealer-access"\)[\s\S]*copy\.dealerLogin/);
  assert.match(footer, /localeHref\(link\.href, locale\)/);
  assert.match(home, /title: "I am a dealer"[\s\S]*?href: "\/dealer-access"/);
  assert.match(homeFr, /title: "Je suis détaillant"[\s\S]*?href: "\/fr\/dealer-access"/);
  assert.match(home, /action: "Dealer Portal"/);
  assert.match(homeV11, /href="\/dealer-access"[\s\S]*?Dealer Portal/);
});

test("dealer access page has no copied shell and no prohibited auth claims", () => {
  assert.doesNotMatch(page, /SiteHeader|SiteFooter|SSO|single sign-on|Rejoindre|加盟/iu);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}/i);
});
