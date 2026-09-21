import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("orders panel gates editing on orders.update and keeps the status transition form", async () => {
  const source = await read("DashboardPanels.tsx");
  const orders = source.slice(source.indexOf("export function OrdersPanel"), source.indexOf("export function PaymentSessionsPanel"));
  assert.match(orders, /canEdit\?: boolean/);
  assert.match(orders, /!props\.canEdit \?/);
  assert.match(orders, /\/dashboard\/orders\/\$\{detail\.id\}\/status/);
  assert.match(orders, /props\.copy\.actions\.view/);
});

test("users panel edit form updates displayName/status through the manage API", async () => {
  const source = await read("DashboardPanels.tsx");
  const users = source.slice(source.indexOf("export function UsersPanel"), source.indexOf("export function RolesPanel"));
  assert.match(users, /canEdit\?: boolean/);
  assert.match(users, /\/dashboard\/users\/\$\{detail\.id\}/);
  assert.match(users, /method: "PATCH"/);
  assert.match(users, /userDisplayNameDraft/);
  assert.match(users, /userStatusDraft/);
  // the row detail affordance is unconditional: it is the ONLY entry point
  // to the edit drawer, so it must exist for writers and readers alike
  assert.match(users, /<button onClick=\{\(\) => openUser\(user\.id\)\} type="button">查看详情<\/button>/);
  assert.doesNotMatch(users, /readOnly \? <button onClick=\{\(\) => openUser/);
});

test("customers panel edit form gates on crm.update with the stage select", async () => {
  const source = await read("DashboardPanels.tsx");
  const crm = source.slice(source.indexOf("export function CrmContactsPanel"), source.indexOf("export function ProductReviewsPanel", source.indexOf("export function CrmContactsPanel")));
  assert.match(crm, /canEdit\?: boolean/);
  assert.match(crm, /\/dashboard\/crm\/contacts\/\$\{detail\.id\}/);
  assert.match(crm, /stage: stageDraft/);
  assert.match(crm, /contactEditing/);
});

test("module permissions register the P2 write grants in both registries", async () => {
  const api = await read("../../lib/api/api-contract.ts");
  assert.match(api, /orders: \["orders\.read", "orders\.update", "orders\.assign"\]/);
  assert.match(api, /customers: \["crm\.read", "crm\.update"\]/);
  assert.match(api, /users: \["users\.manage"\]/);
});

test("readOnlyAction gates P2 routes on the matching grants", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  assert.match(content, /path\.startsWith\("\/dashboard\/orders"\)/);
  assert.match(content, /path\.startsWith\("\/dashboard\/crm\/contacts"\)/);
  assert.match(content, /path\.startsWith\("\/dashboard\/users"\)/);
  assert.match(content, /ordersCanEdit/);
  assert.match(content, /customersCanEdit/);
  assert.match(content, /usersCanEdit/);
});
