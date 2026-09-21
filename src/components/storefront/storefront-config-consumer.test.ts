import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const provider = readFileSync(new URL("./StorefrontProvider.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../layout/SiteHeader.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("S02 StorefrontProvider loads public config by locale with an AbortController fence", () => {
  assert.match(provider, /getStorefrontConfig\(locale\)/);
  assert.match(provider, /const controller = new AbortController\(\)/);
  assert.match(provider, /if \(controller\.signal\.aborted\) return/);
  assert.match(provider, /return \(\) => controller\.abort\(\)/);
  assert.match(provider, /status: "loading" \| "ready" \| "degraded" \| "error"/);
});

test("S02 StorefrontProvider confirms the published generation before claiming ready", () => {
  assert.match(provider, /getS02SettingsReadiness\(projection\.data\.publishedGeneration\)/);
  assert.match(provider, /readiness\.data\.consumerGeneration === projection\.data\.publishedGeneration/);
  assert.match(provider, /readiness\.data\.publishedGeneration === projection\.data\.publishedGeneration/);
  assert.match(provider, /readiness\.data\.state === "ready"/);
  assert.match(provider, /status: exact \? "ready" : "degraded"/);
  assert.match(provider, /if \(projection\.data\.publishedGeneration === 0\) return/);
  assert.match(provider, /generationFence/);
});

test("S02 StorefrontProvider degrades honestly without blocking the safe config", () => {
  assert.match(provider, /status: "degraded",\s*publishedGeneration: projection\.data\.publishedGeneration/);
  assert.match(provider, /status: "error",\s*publishedGeneration: 0/);
  assert.match(provider, /storefrontConfigRef\.current\.effective/);
});

test("S02 SiteHeader consumes siteDisplayName and the announcement rule with static fallback", () => {
  assert.match(header, /storefrontConfigState/);
  assert.match(header, /storefrontConfigState\.effective\.siteDisplayName \|\| "VanStro Global Supply"/);
  assert.match(header, /announcementRule\.enabled/);
  assert.match(header, /announcementRule\.message\.trim\(\).length > 0/);
  assert.match(header, /startsAt \|\| new Date\(announcementRule\.startsAt\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(header, /endsAt \|\| new Date\(announcementRule\.endsAt\)\.getTime\(\) >= Date\.now\(\)/);
  assert.match(header, /header-announcement/);
  assert.match(header, /alt=\{siteDisplayName\}/);
  assert.match(globals, /\.header-announcement/);
});
