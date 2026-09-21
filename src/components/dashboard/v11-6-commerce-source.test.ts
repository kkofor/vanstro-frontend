import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("Orders and CRM contacts keep their real detail drawers", async () => {
  const source = await read("DashboardPanels.tsx");
  const orders = source.slice(source.indexOf("export function OrdersPanel"), source.indexOf("export function PaymentSessionsPanel"));
  const crm = source.slice(source.indexOf("export function CrmContactsPanel"), source.indexOf("export function ContactLeadsPanel", source.indexOf("export function CrmContactsPanel")));
  assert.match(orders, /apiFetch<ApiEnvelope<OrderRecord>>\(`\/dashboard\/orders\/\$\{id\}`\)/);
  assert.match(orders, /<DetailDrawer/);
  assert.match(orders, /<strong>\{order\.paymentSessionId\}<\/strong>/);
  assert.match(orders, /<small>\{order\.id\}<\/small>/);
  assert.match(orders, /props\.copy\.orders\.paymentMethod\[order\.paymentMethod/);
  const columns = orders.match(/columns=\{\[([\s\S]*?)\]\}/)?.[1] ?? "";
  assert.deepEqual(columns.match(/props\.copy\.[\w.]+/g), [
    "props.copy.orders.paymentSessionId",
    "props.copy.orders.paymentMethodLabel",
    "props.copy.common.customer",
    "props.copy.common.status",
    "props.copy.common.total",
    "props.copy.common.fulfillment",
    "props.copy.common.created",
    "props.copy.common.details"
  ]);
  assert.match(crm, /crm\/contacts\/\$\{id\}/);
  assert.match(crm, /<DetailDrawer/);
});

test("Users read-only shell gains a real detail drawer", async () => {
  const source = await read("DashboardPanels.tsx");
  const users = source.slice(source.indexOf("export function UsersPanel"), source.indexOf("export function RolesPanel"));
  assert.match(users, /apiFetch\(`\/dashboard\/users\/\$\{id\}`\)/);
  assert.match(users, /查看详情/);
  assert.match(users, /<DetailDrawer open=\{Boolean\(drawerId && detail\)\}/);
  // write form stays behind readOnly
  assert.match(users, /!props\.readOnly \? <form/);
});

test("Dealers keeps a scoped detail drawer with write affordances gated on canEdit", async () => {
  // V11-R1 F4 lease: the read-only dealers panel gains location/ERP-link
  // management inside the detail drawer, but every write form is gated on
  // props.canEdit (settings.write); the read-only drawer stays intact.
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /apiFetch\(`\/dashboard\/dealers\/\$\{id\}`\)/);
  assert.match(dealers, /查看详情/);
  assert.match(dealers, /<DetailDrawer/);
  assert.ok(dealers.indexOf("props.canEdit ? (") >= 0, "write sections are canEdit-gated");
  // every write handler call site sits after a canEdit gate in the source
  for (const handler of ["createLocation()", "saveLocationEdit(location.id)", "addErpLink()", "unlinkErpLink(link)"]) {
    const site = dealers.indexOf(handler);
    const gate = dealers.slice(0, site).lastIndexOf("props.canEdit ? (");
    assert.ok(site > gate, `${handler} must be gated on props.canEdit`);
  }
  // detail drawer only enabled when apiFetch is present (legacy safe)
  assert.match(dealers, /props\.readOnly && props\.apiFetch/);
});

test("customers q deny and PII discipline stay in the shell and panels", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  assert.match(shell, /legacyCrmSearchUnsupported/);
  assert.match(shell, /客户搜索不可用/);
  const crm = await read("DashboardPanels.tsx");
  const crmSeg = crm.slice(crm.indexOf("export function CrmContactsPanel"), crm.indexOf("export function ProductReviewsPanel"));
  // no client-side name/email search form introduced
  assert.doesNotMatch(crmSeg, /type="search"/);
});

test("commerce slice write buttons follow each module's own gate", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  // orders/customers derive readOnly from their own canEdit; queues stay closed
  assert.match(router, /readOnly=\{readOnlyFor\(props\.ordersCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.customersCanEdit\)\}/);
  assert.match(router, /props\.readOnly \?\? true/);
});
