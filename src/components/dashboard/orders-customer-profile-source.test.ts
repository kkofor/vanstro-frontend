import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("orders tab decouples the main request from the dealers auxiliary", async () => {
  const source = await read("./hooks/useDashboardData.ts");
  const orders = source.match(/case "orders":[\s\S]*?case "paymentSessions"/)?.[0] ?? "";
  assert.ok(orders.length > 0, "orders case must exist");
  // The orders request and the dealers helper run independently; a dealers
  // failure must never reject the whole tab.
  assert.match(orders, /Promise\.allSettled/);
  assert.match(orders, /if \(result\.status === "rejected"\) throw result\.reason/);
  assert.match(orders, /dealersResult\.status === "fulfilled" \? dealersResult\.value : \[\]/);
  assert.doesNotMatch(orders, /fallbackDashboardRead\(fetchData<typeof data\.dealers>\(token, "\/dashboard\/dealers"\), \[\], Boolean\(dashboardOptions\.readOnly\)\)/);
  // Dealer degradation records the partial state instead of failing the list.
  assert.match(orders, /if \(dealersResult\.status === "rejected"\) setResourceStates\(\(current\) => \(\{ \.\.\.current, orders: "partial" \}\)/);
});

test("orders errors carry a non-sensitive request id to the presentation layer", async () => {
  const hook = await read("./hooks/useDashboardData.ts");
  assert.match(hook, /readonly requestId\?: string/);
  assert.match(hook, /response\.headers\.get\("X-Request-Id"\)/);
  assert.match(hook, /setResourceRequestIds/);
  assert.match(hook, /resourceRequestIds,/);

  const content = await read("./DashboardF0ReadOnlyContent.tsx");
  // The generic copy stays; only the non-sensitive request id is added.
  assert.match(content, /数据暂时无法载入/);
  assert.match(content, /请检查网络后重试；如问题持续，请联系管理员。/);
  assert.match(content, /controller\.resourceRequestIds\[activeTab\]/);
  assert.match(content, /请求 ID：/);
  // Raw technical messages are still never rendered.
  assert.doesNotMatch(content, /resourceErrors\[activeTab\]/);
  assert.doesNotMatch(content, /\{error \?\?/);
});

test("OrderRecord PII fields are optional so redacted orders render safely", async () => {
  const source = await read("../../lib/dashboard/types.ts");
  const order = source.match(/export type OrderRecord = \{[\s\S]*?\n\};/)?.[0] ?? "";
  assert.match(order, /email\?: string \| null;/);
  assert.match(order, /firstName\?: string \| null;/);
  assert.match(order, /lastName\?: string \| null;/);
  assert.match(order, /phone\?: string \| null;/);
  assert.doesNotMatch(order, /^  email: string;$/m);
});

test("AdminUser detail carries customer profile and address book as optional fields", async () => {
  const source = await read("../../lib/dashboard/types.ts");
  const user = source.match(/export type AdminUser = \{[\s\S]*?\n\};/)?.[0] ?? "";
  assert.match(user, /customerProfile\?: CustomerProfileRecord \| null;/);
  assert.match(user, /addresses\?: CustomerAddressRecord\[\] \| null;/);
  assert.match(source, /export type CustomerProfileRecord = \{[\s\S]*?firstName\?: string \| null;[\s\S]*?lastName\?: string \| null;[\s\S]*?phone\?: string \| null;/);
  assert.match(source, /export type CustomerAddressRecord = \{[\s\S]*?isDefault: boolean;/);
});

test("OrdersPanel renders redacted orders and a degraded dealer assignment surface", async () => {
  const source = await read("./DashboardPanels.tsx");
  const orders = source.slice(source.indexOf("export function OrdersPanel"), source.indexOf("export function PaymentSessionsPanel"));
  assert.match(orders, /dealersDegraded\?: boolean/);
  assert.match(orders, /order\.email \?\? "-"/);
  assert.match(orders, /detail\.email \?\? "-"/);
  assert.match(orders, /props\.copy\.orders\.dealerUnavailable/);
  assert.doesNotMatch(orders, /<small>\{order\.email\}<\/small>/);
});

test("UsersPanel shows customer profile, address book and visible save errors", async () => {
  const source = await read("./DashboardPanels.tsx");
  const users = source.slice(source.indexOf("const CANADIAN_PROVINCE_OPTIONS"), source.indexOf("export function RolesPanel"));
  assert.match(users, /props\.copy\.users\.customerProfile/);
  assert.match(users, /props\.copy\.users\.addressBook/);
  assert.match(users, /customerProfileUpdated/);
  assert.match(users, /`\/dashboard\/users\/\$\{detail\.id\}\/addresses`/);
  assert.match(users, /`\/dashboard\/users\/\$\{detail\.id\}\/addresses\/\$\{address\.id\}`/);
  assert.match(users, /isDefault: true/);
  assert.match(users, /method: "DELETE"/);
  assert.match(users, /actionError \? <p className="dashboard-form-error" role="alert">\{actionError\}<\/p> : null/);
  // Profile writes are kind-guarded in the UI: admin users keep the admin
  // profile form and customers keep the customer profile + address book.
  assert.match(users, /detail\?\.kind === "admin"/);
  assert.match(users, /isCustomer/);
});

test("the customer/orders copy contract exists in every locale", async () => {
  const copy = await read("../../lib/i18n/dashboard-copy.ts");
  // Each locale block (en, fr, zh) carries the full customer/orders surface.
  const blocks = copy.split(/^const |^export function /m).filter((block) => /users: \{/.test(block));
  assert.ok(blocks.length >= 3, "en, fr and zh locale blocks must exist");
  for (const block of blocks) {
    if (!/users: \{[\s\S]*customerProfile:/.test(block)) continue;
    assert.match(block, /customerProfile: "([^"]+)"/);
    assert.match(block, /addressBook: "([^"]+)"/);
    assert.match(block, /addAddress: "([^"]+)"/);
    assert.match(block, /setDefault: "([^"]+)"/);
    assert.match(block, /postalCode: "([^"]+)"/);
    assert.match(block, /adminProfile: "([^"]+)"/);
    assert.match(block, /saveProfile: "([^"]+)"/);
    assert.match(block, /dealerUnavailable: "([^"]+)"/);
    assert.match(block, /firstName: "([^"]+)"/);
    assert.match(block, /lastName: "([^"]+)"/);
    assert.match(block, /cancel: "([^"]+)"/);
    assert.match(block, /customerProfileUpdated: "([^"]+)"/);
    assert.match(block, /addressAdded: "([^"]+)"/);
    assert.match(block, /addressUpdated: "([^"]+)"/);
    assert.match(block, /addressDeleted: "([^"]+)"/);
    assert.match(block, /defaultAddressSet: "([^"]+)"/);
  }
});
