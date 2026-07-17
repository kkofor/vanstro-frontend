import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const serializerModule = { exports: {} };
const serializerJavaScript = ts.transpileModule(read("src/lib/seo/json-ld.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
new Function("exports", "module", serializerJavaScript)(
  serializerModule.exports,
  serializerModule
);
const { serializeJsonLd } = serializerModule.exports;

const sentinel = serializeJsonLd({
  text: "</script><script>alert(1)</script>&\u2028\u2029"
});
assert(!sentinel.includes("<"), "JSON-LD serializer must escape script-closing sentinels");
assert(sentinel.includes("\\u003c/script"), "JSON-LD serializer must retain escaped content");
assert(sentinel.includes("\\u0026"), "JSON-LD serializer must escape ampersands");

const seoSources = [
  "src/lib/seo/site.ts",
  "src/lib/seo/metadata.ts",
  "src/lib/seo/schema.ts",
  "src/app/layout.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts"
].map(read).join("\n");
assert(!/https:\/\/vanstro\.ca/i.test(seoSources), "SEO code must not assume a production domain");
assert(seoSources.includes("NEXT_PUBLIC_SITE_URL"), "SEO URLs must use the approved site URL environment variable");
assert(seoSources.includes('"@type": "ProductGroup"'), "Product schema must use ProductGroup");
assert(!seoSources.includes("getTotalAvailable"), "Schema availability must not infer truth from numeric quantity");

const articlePage = read("src/app/articles/[slug]/page.tsx");
const mockData = read("src/lib/data/mock-data.ts");
assert(articlePage.includes("noIndex: true"), "Placeholder articles must be noindex");
for (const asset of [
  "cabinet-measuring-guide.gif",
  "cabinet-finishes-guide.gif",
  "dealer-pickup-delivery-guide.gif"
]) {
  assert(mockData.includes(asset), `Article data must reference ${asset}`);
  assert(existsSync(join(root, "public/assets/articles", asset)), `Missing article asset ${asset}`);
}

const supportWidget = read("src/components/layout/CustomerSupportWidget.tsx");
assert(supportWidget.includes('Tiledesk?.("destroy")'), "Tiledesk must be destroyed on consent revocation");
assert(!supportWidget.includes("postalCode"), "Tiledesk attributes must not include postal code");
assert(!supportWidget.includes("cartCount"), "Tiledesk attributes must not include cart count");

const locationDetector = read("src/components/layout/LocationDetector.tsx");
assert(!locationDetector.includes("geolocation"), "Location must not be requested automatically");
assert(!locationDetector.includes("latitude"), "Precise latitude must not be retained");
assert(!locationDetector.includes("longitude"), "Precise longitude must not be retained");

const workflow = read(".github/workflows/deploy-pages.yml");
const actionUses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
assert(actionUses.length > 0, "Workflow must use reviewed actions");
for (const action of actionUses) {
  assert(/^[^@]+@[a-f0-9]{40}$/.test(action), `Action is not pinned to a full SHA: ${action}`);
}
assert(workflow.includes("persist-credentials: false"), "Checkout credentials must not persist");
assert(!workflow.includes("enablement: true"), "Deploy workflow must not change Pages settings");
assert(workflow.includes('NEXT_TELEMETRY_DISABLED: "1"'), "CI telemetry policy must be explicit");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.packageManager, "pnpm@11.13.0", "packageManager must be exact");

console.log("SEO/security checks passed");
