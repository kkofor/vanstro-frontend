import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFile(`${root}/${path}`, "utf8");

const [checkout, contract, commerce, schema, favorites, storefront, copy, login, register, frenchLogin, frenchRegister, authForm, accountProfile, paymentClient, customerSession, apiClient, header, dashboard, catalog, submissions, reviews] = await Promise.all([
  read("src/components/checkout/CheckoutClient.tsx"),
  read("src/lib/api/api-contract.ts"),
  read("apps/api/src/routes/commerce/index.ts"),
  read("packages/db/prisma/schema.prisma"),
  read("src/components/product/FavoritesClient.tsx"),
  read("src/components/storefront/StorefrontProvider.tsx"),
  read("src/lib/i18n/commerce-copy.ts"),
  read("src/app/account/login/page.tsx"),
  read("src/app/account/register/page.tsx"),
  read("src/app/fr/account/login/page.tsx"),
  read("src/app/fr/account/register/page.tsx"),
  read("src/components/account/CustomerAuthForm.tsx"),
  read("src/components/account/AccountProfileClient.tsx"),
  read("src/components/checkout/PaymentClient.tsx"),
  read("src/components/account/CustomerSessionProvider.tsx"),
  read("src/lib/api/api-client.ts"),
  read("src/components/layout/SiteHeader.tsx"),
  read("src/components/dashboard/DashboardPanels.tsx"),
  read("apps/api/src/routes/catalog.ts"),
  read("apps/api/src/routes/submissions.ts"),
  read("src/components/product/ProductReviewSection.tsx")
]);

for (const field of ["firstName", "lastName", "phone", "notes"]) {
  assert.match(checkout, new RegExp(`${field}:`), `checkout must submit ${field}`);
  assert.match(contract, new RegExp(`\\b${field}[?]?:`), `checkout contract must include ${field}`);
}
assert.match(checkout, /\n\s+paymentMethod,/, "checkout must submit paymentMethod");
assert.match(contract, /\bpaymentMethod:\s*"card" \| "pos" \| "cash"/, "checkout contract must include paymentMethod");
assert.match(commerce, /guestFirstName: firstName/);
assert.match(commerce, /paymentMethod,\s*\n\s*notes/);
assert.match(commerce, /paymentMethod: session\.paymentMethod/);
assert.match(schema, /guestFirstName\s+String/);
assert.match(schema, /paymentMethod\s+String/);

assert.match(favorites, /favoritesState\.status === "error"/);
assert.match(favorites, /favoritesState\.errorCode === "AUTH_REQUIRED"/);
assert.match(favorites, /localeHref\("\/account\/login", locale\)/);
assert.match(favorites, /onClick=\{refreshFavorites\}/);
assert.match(favorites, /copy\.favorites\.browse/);
assert.match(storefront, /errorCode: normalizeApiErrorCode\(error\)/);
assert.match(copy, /authRequiredTitle: "Connectez-vous pour voir vos favoris"/);
assert.match(copy, /retry: "Réessayer"/);

for (const source of [login, register, frenchLogin, frenchRegister]) {
  assert.doesNotMatch(source, /saved addresses|adresses|saved orders|commandes|account details|renseignements de votre compte/i);
  assert.match(source, /favorite|favoris/i);
}
assert.match(authForm, /router\.push\(localeHref\("\/account", locale\)\)/);
assert.match(authForm, /minLength=\{isRegister \? 12 : undefined\}/);
assert.match(authForm, /aria-describedby=\{fieldErrors\.password \? "auth-password-error" : isRegister \? "password-requirement" : undefined\}/);
assert.match(authForm, /id="auth-password-error"/);
assert.match(authForm, /copy\.auth\.passwordRequirement/);
assert.match(copy, /passwordRequirement: "Use at least 12 characters\.[^"]*unique passphrase[^"]*"/);
assert.match(copy, /passwordRequirement: "Utilisez au moins 12 caractères\.[^"]*phrase de passe[^"]*"/);
assert.match(customerSession, /vanstroApi\.getCurrentSession\(\)/);
assert.match(customerSession, /await vanstroApi\.logout\(\)/);
assert.match(apiClient, /credentials: "include"/);
assert.doesNotMatch(apiClient, /ACCESS_TOKEN_KEY/);
assert.match(contract, /"refund_processing"/);
assert.match(paymentClient, /session\.status === "refund_pending" \|\| session\.status === "refund_processing"/);
assert.match(accountProfile, /await vanstroApi\.updateAccountMe\([\s\S]*?const response = await vanstroApi\.getAccountMe\(\)/);
assert.match(accountProfile, /setState\(\{ status: "success", profile: response\.data \}\)/);
assert.match(header, /customerSession\.status === "authenticated"/);
assert.match(header, /copy\.account\.signOut/);
assert.doesNotMatch(dashboard, /admin@vanstro\.local/);
assert.match(dashboard, /review\.title\?\.trim\(\) \|\| props\.copy\.reviews\.untitled/);
assert.doesNotMatch(catalog, /review\.title \?\? "Product review"/);
assert.doesNotMatch(submissions, /review\.title \?\? "Product review"/);
assert.match(reviews, /review\.title\?\.trim\(\) \|\| \(french \? "Avis sur le produit" : "Product review"\)/);

console.log("Verified checkout fields, password requirements, actionable localized favorites errors, safe customer session/logout wiring, truthful auth copy, dashboard privacy, and localized review fallback.");
