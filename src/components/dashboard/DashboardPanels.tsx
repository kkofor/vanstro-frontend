"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import type { DashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import type {
  AdminUser,
  ArticleRecord,
  AnalyticsSummary,
  AuditLogRecord,
  Category,
  CmsSubTab,
  ContactLead,
  CrmContactDetail,
  CrmContactRecord,
  Dealer,
  DealerApplication,
  DealerDependencies,
  EmailOutboxItem,
  EmailProviderAccount,
  EmailTemplateItem,
  ErpSyncJobRecord,
  InventorySnapshotRecord,
  LegalPageSummary,
  OperationalAlert,
  OrderRecord,
  PageMeta,
  PaymentSessionRecord,
  Price,
  Product,
  ProductReviewQueueItem,
  Promotion,
  Role,
  SupportHandoffItem
} from "@/lib/dashboard/types";
import {
  displayDashboardStatus,
  displayDashboardValue,
  formatCents,
  formatDate
} from "@/lib/dashboard/format";
import { slugify } from "@/lib/dashboard/api";
import {
  DetailDrawer,
  NotesList,
  PaginationBar,
  PanelHeader,
  QueueStatusFilter,
  Table
} from "./shared/primitives";

type ApiEnvelope<T> = { data: T };

type ActionHandler = (
  path: string,
  body: Record<string, unknown>,
  options: { method?: string; success: string }
) => Promise<void>;

type ApiFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

function pageLabel(copy: DashboardCopy, meta: PageMeta) {
  return copy.pagination.showing(meta.page, meta.totalPages, meta.total);
}

function transcriptCount(transcript: unknown) {
  if (Array.isArray(transcript)) return transcript.length;
  if (transcript && typeof transcript === "object") return Object.keys(transcript).length;
  return 0;
}

function cmsEditorValue(data: unknown) {
  if (data && typeof data === "object" && "payload" in data) {
    return JSON.stringify((data as { payload: unknown }).payload ?? {}, null, 2);
  }
  return JSON.stringify(data ?? {}, null, 2);
}

function QuickForm(props: {
  children?: ReactNode;
  fields: Array<{ label: string; value: string; onChange: (value: string) => void; type?: string; hint?: string }>;
  onSubmit: () => void;
  title: string;
  submitLabel?: string;
}) {
  return (
    <form
      className="dashboard-card dashboard-quick-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <h3>{props.title}</h3>
      {props.fields.map((field) => (
        <label className="field" key={field.label}>
          <span>{field.label}</span>
          <input
            type={field.type ?? "text"}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
          />
          {field.hint ? <small className="field-help">{field.hint}</small> : null}
        </label>
      ))}
      {props.children}
      <button className="button button-primary" type="submit">
        {props.submitLabel ?? props.title}
      </button>
    </form>
  );
}

export function QueueActionCell(props: { actions: Array<{ label: string; onClick: () => void }> }) {
  return (
    <div className="dashboard-row-actions">
      {props.actions.map((action) => (
        <button className="button button-secondary" key={action.label} onClick={action.onClick} type="button">
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function ContactLeadsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  leads: ContactLead[];
  users: AdminUser[];
  dealers: Dealer[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactLead | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignDealerId, setAssignDealerId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function openLead(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<ContactLead>>(`/dashboard/contact-leads/${id}`);
    setDetail(payload.data);
    setStatusDraft(payload.data.status);
    setAssignUserId(payload.data.assignedToUserId ?? "");
    setAssignDealerId(payload.data.assignedDealerId ?? "");
    setNoteDraft("");
    setDrawerId(id);
  }

  function closeDrawer() {
    setDrawerId(null);
    setDetail(null);
  }

  return (
    <>
      <PanelHeader title={props.copy.leads.title} copy={props.copy.leads.copy} />
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "new", label: props.copy.statusValues.lead.new },
          { value: "routed", label: props.copy.statusValues.lead.routed },
          { value: "closed", label: props.copy.statusValues.lead.closed },
          { value: "spam", label: props.copy.statusValues.lead.spam }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.leads.title}
        emptyMessage={`${props.copy.leads.title}: ${props.copy.common.noRecords}`}
        columns={[
          `${props.copy.common.name} / ${props.copy.common.email}`,
          props.copy.leads.topic,
          props.copy.common.status,
          props.copy.common.phone,
          props.copy.leads.location,
          props.copy.common.details
        ]}
        rows={props.leads.map((lead) => [
          <span key="lead">
            <strong>{lead.name}</strong>
            <small>{lead.email}</small>
          </span>,
          lead.topic,
          displayDashboardStatus(props.copy, "lead", lead.status),
          lead.phone ?? "-",
          [lead.city, lead.preferredDealer].filter(Boolean).join(" / ") || "-",
          <QueueActionCell
            key="actions"
            actions={[{ label: props.copy.actions.view, onClick: () => void openLead(lead.id) }]}
          />
        ])}
      />
      <DetailDrawer
        open={Boolean(drawerId && detail)}
        title={detail ? `${detail.name} — ${detail.email}` : props.copy.leads.title}
        onClose={closeDrawer}
      >
        {detail ? (
          <>
            <p>{detail.message}</p>
            <p>
              <strong>{props.copy.common.phone}:</strong> {detail.phone ?? "-"}
            </p>
            <p>
              <strong>{props.copy.leads.topic}:</strong> {detail.topic}
            </p>
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/contact-leads/${detail.id}/status`,
                    { status: statusDraft },
                    { method: "PATCH", success: props.copy.messages.leadStatusUpdated }
                  )
                  .then(() => void openLead(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.status}</span>
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {["new", "routed", "closed", "spam"].map((status) => (
                    <option key={status} value={status}>
                      {displayDashboardStatus(props.copy, "lead", status)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-primary" type="submit">
                {props.copy.actions.save}
              </button>
            </form> : null}
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/contact-leads/${detail.id}/assign`,
                    { assignedToUserId: assignUserId || null, assignedDealerId: assignDealerId || null },
                    { success: props.copy.messages.leadAssigned }
                  )
                  .then(() => void openLead(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.email}</span>
                <select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)}>
                  <option value="">{props.copy.users.noRole}</option>
                  {props.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{props.copy.dealers.title}</span>
                <select value={assignDealerId} onChange={(event) => setAssignDealerId(event.target.value)}>
                  <option value="">{props.copy.common.select}</option>
                  {props.dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.assign}
              </button>
            </form> : null}
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteDraft.trim()) return;
                void props
                  .onAction(
                    `/dashboard/contact-leads/${detail.id}/notes`,
                    { note: noteDraft },
                    { success: props.copy.messages.leadNoteAdded }
                  )
                  .then(() => {
                    setNoteDraft("");
                    return openLead(detail.id);
                  })
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.note}</span>
                <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} required />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.addNote}
              </button>
            </form> : null}
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function DealerApplicationsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  applications: DealerApplication[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DealerApplication | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function openApplication(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<DealerApplication>>(`/dashboard/dealer-applications/${id}`);
    setDetail(payload.data);
    setStatusDraft(payload.data.status);
    setNoteDraft("");
    setDrawerId(id);
  }

  return (
    <>
      <PanelHeader title={props.copy.applications.title} copy={props.copy.applications.copy} />
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "submitted", label: props.copy.statusValues.application.submitted },
          { value: "under_review", label: props.copy.statusValues.application.under_review },
          { value: "approved", label: props.copy.statusValues.application.approved },
          { value: "rejected", label: props.copy.statusValues.application.rejected },
          { value: "archived", label: props.copy.statusValues.application.archived }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.applications.title}
        emptyMessage={`${props.copy.applications.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.applications.company,
          props.copy.applications.contact,
          props.copy.applications.market,
          props.copy.common.status,
          props.copy.common.message,
          props.copy.common.details
        ]}
        rows={props.applications.map((application) => [
          <span key="company">
            <strong>{application.companyName}</strong>
            <small>{application.email}</small>
          </span>,
          `${application.contactName} / ${application.phone}`,
          `${application.city}, ${application.province}`,
          displayDashboardStatus(props.copy, "application", application.status),
          application.message ?? "-",
          <QueueActionCell
            key="actions"
            actions={[{ label: props.copy.actions.view, onClick: () => void openApplication(application.id) }]}
          />
        ])}
      />
      <DetailDrawer
        open={Boolean(drawerId && detail)}
        title={detail?.companyName ?? props.copy.applications.title}
        onClose={() => {
          setDrawerId(null);
          setDetail(null);
        }}
      >
        {detail ? (
          <>
            <p>{detail.message ?? "-"}</p>
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/dealer-applications/${detail.id}/status`,
                    { status: statusDraft },
                    { method: "PATCH", success: props.copy.messages.applicationStatusUpdated }
                  )
                  .then(() => void openApplication(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.status}</span>
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {["submitted", "under_review", "approved", "rejected", "archived"].map((status) => (
                    <option key={status} value={status}>
                      {displayDashboardStatus(props.copy, "application", status)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-primary" type="submit">
                {props.copy.actions.save}
              </button>
            </form> : null}
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteDraft.trim()) return;
                void props
                  .onAction(
                    `/dashboard/dealer-applications/${detail.id}/notes`,
                    { note: noteDraft },
                    { success: props.copy.messages.applicationNoteAdded }
                  )
                  .then(() => {
                    setNoteDraft("");
                    return openApplication(detail.id);
                  })
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.note}</span>
                <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} required />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.addNote}
              </button>
            </form> : null}
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function ProductReviewsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  reviews: ProductReviewQueueItem[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductReviewQueueItem | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function openReview(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<ProductReviewQueueItem>>(`/dashboard/product-reviews/${id}`);
    setDetail(payload.data);
    setStatusDraft(payload.data.status);
    setNoteDraft("");
    setDrawerId(id);
  }

  return (
    <>
      <PanelHeader title={props.copy.reviews.title} copy={props.copy.reviews.copy} />
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "pending", label: props.copy.statusValues.review.pending },
          { value: "published", label: props.copy.statusValues.review.published },
          { value: "rejected", label: props.copy.statusValues.review.rejected },
          { value: "archived", label: props.copy.statusValues.review.archived }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.reviews.title}
        emptyMessage={`${props.copy.reviews.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.common.product,
          props.copy.reviews.reviewer,
          props.copy.reviews.rating,
          props.copy.common.status,
          props.copy.reviews.review,
          props.copy.common.details
        ]}
        rows={props.reviews.map((review) => [
          <span key="product">
            <strong>{review.product?.name ?? props.copy.reviews.fallbackProduct}</strong>
            <small>{review.email}</small>
          </span>,
          review.nickname,
          `${review.rating}/5`,
          displayDashboardStatus(props.copy, "review", review.status),
          <span key="review">
            <strong>{review.title?.trim() || props.copy.reviews.untitled}</strong>
            <small>{review.body}</small>
          </span>,
          <QueueActionCell
            key="actions"
            actions={[{ label: props.copy.actions.view, onClick: () => void openReview(review.id) }]}
          />
        ])}
      />
      <DetailDrawer
        open={Boolean(drawerId && detail)}
        title={detail?.title?.trim() || props.copy.reviews.untitled}
        onClose={() => {
          setDrawerId(null);
          setDetail(null);
        }}
      >
        {detail ? (
          <>
            <p>{detail.body}</p>
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/product-reviews/${detail.id}/status`,
                    { status: statusDraft },
                    { method: "PATCH", success: props.copy.messages.reviewStatusUpdated }
                  )
                  .then(() => void openReview(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.status}</span>
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {["pending", "published", "rejected", "archived"].map((status) => (
                    <option key={status} value={status}>
                      {displayDashboardStatus(props.copy, "review", status)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-primary" type="submit">
                {props.copy.actions.save}
              </button>
            </form> : null}
            {!props.readOnly ? <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteDraft.trim()) return;
                void props
                  .onAction(
                    `/dashboard/product-reviews/${detail.id}/notes`,
                    { note: noteDraft },
                    { success: props.copy.messages.reviewNoteAdded }
                  )
                  .then(() => {
                    setNoteDraft("");
                    return openReview(detail.id);
                  })
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.note}</span>
                <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} required />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.addNote}
              </button>
            </form> : null}
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function SupportHandoffsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  handoffs: SupportHandoffItem[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  return (
    <>
      <PanelHeader title={props.copy.handoffs.title} copy={props.copy.handoffs.copy} />
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "new", label: props.copy.handoffs.filterNew },
          { value: "in_progress", label: props.copy.statusValues.handoff.in_progress },
          { value: "resolved", label: props.copy.statusValues.handoff.resolved },
          { value: "closed", label: props.copy.statusValues.handoff.closed }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.handoffs.title}
        emptyMessage={`${props.copy.handoffs.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.handoffs.channel,
          props.copy.handoffs.sourcePath,
          props.copy.common.status,
          "Dealer",
          "Cart",
          "Transcript",
          props.copy.common.created,
          props.copy.common.details
        ]}
        rows={props.handoffs.map((handoff) => [
          <span key="channel">
            <strong>{handoff.channel}</strong>
            <small>{handoff.id}</small>
          </span>,
          handoff.sourcePath,
          displayDashboardStatus(props.copy, "handoff", handoff.status),
          handoff.dealerId ?? "-",
          handoff.cartId ?? "-",
          String(transcriptCount(handoff.transcript)),
          formatDate(handoff.createdAt, props.locale),
          props.readOnly ? "-" : (
          <form
            key="actions"
            className="dashboard-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const status = statusById[handoff.id] ?? handoff.status;
              void props
                .onAction(
                  `/dashboard/support/handoffs/${handoff.id}/status`,
                  { status },
                  { method: "PATCH", success: props.copy.messages.handoffStatusUpdated }
                )
                .then(() => props.onReload());
            }}
          >
            <select
              value={statusById[handoff.id] ?? handoff.status}
              onChange={(event) =>
                setStatusById((current) => ({ ...current, [handoff.id]: event.target.value }))
              }
            >
              {["new", "in_progress", "resolved", "closed"].map((status) => (
                <option key={status} value={status}>
                  {displayDashboardStatus(props.copy, "handoff", status)}
                </option>
              ))}
            </select>
            <button className="button button-secondary" type="submit">
              {props.copy.actions.save}
            </button>
          </form>
          )
        ])}
      />
    </>
  );
}

export function ProductsPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  copy: DashboardCopy;
  locale: string;
  products: Product[];
  categories: Category[];
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [productInput, setProductInput] = useState({ name: "", slug: "", categoryId: "", status: "draft" });
  const [skuInput, setSkuInput] = useState({ productId: "", skuCode: "", name: "" });
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("draft");
  const [mpnDraft, setMpnDraft] = useState("");
  const [brandDraft, setBrandDraft] = useState("");
  const [shortDescriptionDraft, setShortDescriptionDraft] = useState("");
  const [highlightsDraft, setHighlightsDraft] = useState("[]");
  const [specInput, setSpecInput] = useState({ key: "", value: "" });
  const [mappingDrafts, setMappingDrafts] = useState<
    Record<string, { erpSystem: string; erpSkuKey: string; erpProductId: string; erpSkuId: string; mappingId?: string }>
  >({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { id?: string; amountCents: string; currency: string }>>({});
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, { locationId?: string; onHand: string }>>({});

  async function openProduct(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<Product>>(`/dashboard/products/${id}`);
    setDetail(payload.data);
    setEditing(false);
    const drafts: Record<string, { id?: string; amountCents: string; currency: string }> = {};
    for (const sku of payload.data.skus ?? []) {
      const price = sku.prices?.find((entry) => entry.status === "active") ?? sku.prices?.[0];
      drafts[sku.id] = { id: price?.id, amountCents: String(price?.amountCents ?? ""), currency: price?.currency ?? "CAD" };
    }
    setPriceDrafts(drafts);
    const invDrafts: Record<string, { locationId?: string; onHand: string }> = {};
    for (const sku of payload.data.skus ?? []) {
      const snapshot = sku.inventorySnapshots?.[0];
      invDrafts[sku.id] = { locationId: snapshot?.dealerLocation?.id, onHand: String(snapshot?.quantityOnHand ?? "") };
    }
    setInventoryDrafts(invDrafts);
    setNameDraft(payload.data.name);
    setSlugDraft(payload.data.slug);
    setStatusDraft(payload.data.status);
    setMpnDraft(payload.data.manufacturerPartNumber ?? "");
    setBrandDraft(payload.data.brand ?? "");
    setShortDescriptionDraft(payload.data.shortDescription ?? "");
    setHighlightsDraft(JSON.stringify(payload.data.productHighlights ?? [], null, 2));
    setMappingDrafts(
      Object.fromEntries(
        (payload.data.skus ?? []).map((sku) => {
          const mapping = sku.erpMappings?.[0];
          return [
            sku.id,
            {
              mappingId: mapping?.id,
              erpSystem: mapping?.erpSystem ?? "vanstro-erp",
              erpSkuKey: mapping?.erpSkuKey ?? sku.skuCode,
              erpProductId: mapping?.erpProductId ? String(mapping.erpProductId) : "",
              erpSkuId: mapping?.erpSkuId ? String(mapping.erpSkuId) : ""
            }
          ];
        })
      )
    );
    setDrawerId(id);
  }

  return (
    <>
      <PanelHeader title={props.copy.products.title} copy={props.copy.products.copy} />
      {!props.readOnly ? <><div className="dashboard-form-grid">
        <QuickForm
          fields={[
            {
              label: props.copy.common.name,
              value: productInput.name,
              onChange: (name) =>
                setProductInput({
                  ...productInput,
                  name,
                  slug: productInput.slug || slugify(name)
                })
            },
            {
              label: props.copy.common.slug,
              value: productInput.slug,
              onChange: (slug) => setProductInput({ ...productInput, slug }),
              hint: "页面地址中的英文标识（短横线格式）；留空时按产品名称自动生成"
            }
          ]}
          onSubmit={() =>
            void props
              .onAction(
                "/dashboard/products",
                {
                  name: productInput.name,
                  slug: productInput.slug,
                  categoryId: productInput.categoryId || null,
                  status: productInput.status
                },
                { success: props.copy.messages.productCreated }
              )
              .then(() => {
                setProductInput({ name: "", slug: "", categoryId: "", status: "draft" });
                return props.onReload();
              })
          }
          title={props.copy.products.createProduct}
        >
          <label className="field">
            <span>{props.copy.common.category}</span>
            <select
              value={productInput.categoryId}
              onChange={(event) => setProductInput({ ...productInput, categoryId: event.target.value })}
            >
              <option value="">{props.copy.products.noCategory}</option>
              {props.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </QuickForm>
        <form
          className="dashboard-card dashboard-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            void props
              .onAction(
                `/dashboard/products/${skuInput.productId}/skus`,
                { skuCode: skuInput.skuCode, name: skuInput.name },
                { success: props.copy.messages.skuCreated }
              )
              .then(() => {
                setSkuInput({ productId: "", skuCode: "", name: "" });
                return props.onReload();
              });
          }}
        >
          <h3>{props.copy.products.addSku}</h3>
          <label className="field">
            <span>{props.copy.common.product}</span>
            <select
              value={skuInput.productId}
              onChange={(event) => setSkuInput({ ...skuInput, productId: event.target.value })}
              required
            >
              <option value="">{props.copy.common.select}</option>
              {props.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{props.copy.products.skuCode}</span>
            <input
              value={skuInput.skuCode}
              onChange={(event) => setSkuInput({ ...skuInput, skuCode: event.target.value })}
              required
            />
            <small className="field-help">商家自定义货号/规格编号，全局唯一；用于价格、库存与 ERP 关联</small>
          </label>
          <label className="field">
            <span>{props.copy.common.name}</span>
            <input
              value={skuInput.name}
              onChange={(event) => setSkuInput({ ...skuInput, name: event.target.value })}
              required
            />
          </label>
          <button className="button button-primary" type="submit">
            {props.copy.products.addSku}
          </button>
        </form>
      </div></> : null}
      <Table
        caption={props.copy.products.title}
        emptyMessage={`${props.copy.products.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.common.name,
          props.copy.common.status,
          props.copy.common.category,
          props.copy.products.skus,
          props.copy.common.details
        ]}
        rows={props.products.map((product) => [
          <span key="name">
            <strong>{product.name}</strong>
            <small>{product.slug}</small>
          </span>,
          displayDashboardValue(props.copy, product.status),
          product.category?.name ?? "-",
          product.skus?.map((sku) => sku.skuCode).join(", ") || "-",
          <QueueActionCell
            key="actions"
            actions={[
              { label: props.copy.actions.view, onClick: () => void openProduct(product.id) },
              ...(props.canEdit ? [{ label: "编辑", onClick: () => { void openProduct(product.id).then(() => setEditing(true)); } }] : [])
            ]}
          />
        ])}
      />
      <DetailDrawer
        open={Boolean(drawerId && detail)}
        title={detail?.name ?? props.copy.products.title}
        onClose={() => {
          setDrawerId(null);
          setDetail(null);
        }}
      >
        {detail ? (
          !props.canEdit || !editing ? (
            <>
              <p><strong>{props.copy.common.status}:</strong> {displayDashboardValue(props.copy, detail.status)}</p>
              <h4>{props.copy.products.skus}</h4>
              <ul className="dashboard-notes-list">{(detail.skus ?? []).map((sku) => <li key={sku.id}><strong>{sku.skuCode}</strong> — {sku.name}</li>)}</ul>
              <h4>{props.copy.products.specifications}</h4>
              <ul className="dashboard-notes-list">{(detail.specifications ?? []).map((spec) => <li key={spec.id}><strong>{spec.label ?? spec.key}</strong>: {spec.value}</li>)}</ul>
            </>
          ) : (
          <>
            <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (statusDraft === "archived" && !window.confirm("归档后将从默认列表隐藏，可随时恢复。确认归档？")) return;
                let productHighlights: unknown = [];
                try {
                  productHighlights = JSON.parse(highlightsDraft || "[]");
                } catch {
                  return;
                }
                void props
                  .onAction(
                    `/dashboard/products/${detail.id}`,
                    {
                      name: nameDraft,
                      slug: slugDraft,
                      status: statusDraft,
                      manufacturerPartNumber: mpnDraft || null,
                      brand: brandDraft || null,
                      shortDescription: shortDescriptionDraft || null,
                      productHighlights
                    },
                    { method: "PATCH", success: props.copy.messages.productUpdated }
                  )
                  .then(() => void openProduct(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.name}</span>
                <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} required />
              </label>
              <label className="field">
                <span>{props.copy.common.slug}</span>
                <input value={slugDraft} onChange={(event) => setSlugDraft(event.target.value)} required />
                <small className="field-help">页面地址中的英文标识（短横线格式）；修改后旧网址将不再生效</small>
              </label>
              <label className="field">
                <span>{props.copy.common.status}</span>
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {["draft", "active", "archived"].map((status) => (
                    <option key={status} value={status}>
                      {displayDashboardValue(props.copy, status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{props.copy.products.mpn}</span>
                <input value={mpnDraft} onChange={(event) => setMpnDraft(event.target.value)} />
              </label>
              <label className="field">
                <span>{props.copy.products.brand}</span>
                <input value={brandDraft} onChange={(event) => setBrandDraft(event.target.value)} />
              </label>
              <fieldset>
                <legend>{props.copy.products.inventory}</legend>
                {(detail.skus ?? []).map((sku) => {
                  const draft = inventoryDrafts[sku.id];
                  if (!draft) return null;
                  return (
                    <div className="dashboard-inline-form" key={sku.id}>
                      <strong>{sku.skuCode}</strong>
                      <label className="field">
                        <span>{props.copy.products.onHand}</span>
                        <input
                          inputMode="numeric"
                          type="number"
                          min={0}
                          value={draft.onHand}
                          onChange={(event) => setInventoryDrafts((current) => ({ ...current, [sku.id]: { ...current[sku.id], onHand: event.target.value } }))}
                        />
                      </label>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() =>
                          void props
                            .onAction(
                              "/dashboard/inventory/snapshots",
                              { skuId: sku.id, dealerLocationId: draft.locationId ?? null, quantityOnHand: Number(draft.onHand) },
                              { method: "POST", success: props.copy.messages.productUpdated }
                            )
                            .then(() => props.onReload())
                        }
                      >
                        {props.copy.actions.saveInventory ?? "保存库存"}
                      </button>
                    </div>
                  );
                })}
              </fieldset>
              <fieldset>
                <legend>{props.copy.products.prices}</legend>
                {(detail.skus ?? []).map((sku) => {
                  const draft = priceDrafts[sku.id];
                  if (!draft) return null;
                  return (
                    <div className="dashboard-inline-form" key={sku.id}>
                      <strong>{sku.skuCode}</strong>
                      <label className="field">
                        <span>{props.copy.products.priceCents}</span>
                        <input
                          inputMode="numeric"
                          type="number"
                          value={draft.amountCents}
                          onChange={(event) => setPriceDrafts((current) => ({ ...current, [sku.id]: { ...current[sku.id], amountCents: event.target.value } }))}
                        />
                      </label>
                      {draft.id ? (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() =>
                            void props
                              .onAction(
                                `/dashboard/pricing/${draft.id}`,
                                { amountCents: Number(draft.amountCents) },
                                { method: "PATCH", success: props.copy.messages.productUpdated }
                              )
                              .then(() => props.onReload())
                          }
                        >
                          {props.copy.actions.savePrice ?? "保存价格"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
              <label className="field">
                <span>{props.copy.products.shortDescription}</span>
                <textarea value={shortDescriptionDraft} onChange={(event) => setShortDescriptionDraft(event.target.value)} rows={3} />
              </label>
              <label className="field">
                <span>{props.copy.products.highlightsJson}</span>
                <textarea value={highlightsDraft} onChange={(event) => setHighlightsDraft(event.target.value)} rows={4} />
              </label>
              <div className="dashboard-row-actions">
                <button className="button button-primary" type="submit">
                  {props.copy.actions.save}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() =>
                    void props
                      .onAction(`/dashboard/products/${detail.id}/refresh-erp-colors`, {}, {
                        method: "POST",
                        success: props.copy.messages.productUpdated
                      })
                      .then(() => void openProduct(detail.id))
                  }
                >
                  {props.copy.products.refreshErpColors}
                </button>
              </div>
            </form>
            <h4>{props.copy.products.skus}</h4>
            <ul className="dashboard-notes-list">
              {(detail.skus ?? []).map((sku) => {
                const mappingDraft = mappingDrafts[sku.id] ?? {
                  erpSystem: "vanstro-erp",
                  erpSkuKey: sku.skuCode,
                  erpProductId: "",
                  erpSkuId: ""
                };
                return (
                <li key={sku.id}>
                  <strong>{sku.skuCode}</strong> — {sku.name}
                  <div className="dashboard-inline-form">
                    <label className="field">
                      <span>{props.copy.products.erpSystem}</span>
                      <input
                        value={mappingDraft.erpSystem}
                        onChange={(event) =>
                          setMappingDrafts((current) => ({
                            ...current,
                            [sku.id]: { ...mappingDraft, erpSystem: event.target.value }
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>{props.copy.products.erpSkuKey}</span>
                      <input
                        value={mappingDraft.erpSkuKey}
                        onChange={(event) =>
                          setMappingDrafts((current) => ({
                            ...current,
                            [sku.id]: { ...mappingDraft, erpSkuKey: event.target.value }
                          }))
                        }
                      />
                      <small className="field-help">ERP 系统中该 SKU 的编码，用于同步匹配</small>
                    </label>
                    <label className="field">
                      <span>{props.copy.products.erpProductId}</span>
                      <input
                        value={mappingDraft.erpProductId}
                        onChange={(event) =>
                          setMappingDrafts((current) => ({
                            ...current,
                            [sku.id]: { ...mappingDraft, erpProductId: event.target.value }
                          }))
                        }
                      />
                      <small className="field-help">ERP 系统中的产品编号（数字）</small>
                    </label>
                    <label className="field">
                      <span>{props.copy.products.erpSkuId}</span>
                      <input
                        value={mappingDraft.erpSkuId}
                        onChange={(event) =>
                          setMappingDrafts((current) => ({
                            ...current,
                            [sku.id]: { ...mappingDraft, erpSkuId: event.target.value }
                          }))
                        }
                      />
                      <small className="field-help">ERP 系统中的 SKU 记录编号（数字）</small>
                    </label>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        const body = {
                          skuId: sku.id,
                          erpSystem: mappingDraft.erpSystem,
                          erpSkuKey: mappingDraft.erpSkuKey,
                          erpProductId: mappingDraft.erpProductId ? Number(mappingDraft.erpProductId) : undefined,
                          erpSkuId: mappingDraft.erpSkuId ? Number(mappingDraft.erpSkuId) : undefined
                        };
                        const endpoint = mappingDraft.mappingId
                          ? `/dashboard/sku-mappings/${mappingDraft.mappingId}`
                          : "/dashboard/sku-mappings";
                        void props
                          .onAction(endpoint, body, {
                            method: mappingDraft.mappingId ? "PATCH" : "POST",
                            success: props.copy.messages.productUpdated
                          })
                          .then(() => void openProduct(detail.id));
                      }}
                    >
                      {props.copy.products.erpMapping}
                    </button>
                  </div>
                  <div className="dashboard-row-actions">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        void props
                          .onAction(
                            `/dashboard/skus/${sku.id}`,
                            { status: "archived" },
                            { method: "PATCH", success: props.copy.messages.productUpdated }
                          )
                          .then(() => void openProduct(detail.id))
                          .then(() => props.onReload())
                      }
                    >
                      {props.copy.actions.edit}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        void props
                          .onAction(`/dashboard/skus/${sku.id}`, {}, { method: "DELETE", success: props.copy.messages.productUpdated })
                          .then(() => void openProduct(detail.id))
                          .then(() => props.onReload())
                      }
                    >
                      {props.copy.actions.delete}
                    </button>
                  </div>
                </li>
              );
              })}
            </ul>
            <h4>{props.copy.products.specifications}</h4>
            <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/products/${detail.id}/specifications`,
                    { key: specInput.key, value: specInput.value },
                    { method: "POST", success: props.copy.messages.productUpdated }
                  )
                  .then(() => {
                    setSpecInput({ key: "", value: "" });
                    return openProduct(detail.id);
                  });
              }}
            >
              <label className="field">
                <span>{props.copy.products.specKey}</span>
                <input value={specInput.key} onChange={(event) => setSpecInput({ ...specInput, key: event.target.value })} required />
                <small className="field-help">规格项英文标识，如 material、weight；与规格值成对展示</small>
              </label>
              <label className="field">
                <span>{props.copy.products.specValue}</span>
                <input value={specInput.value} onChange={(event) => setSpecInput({ ...specInput, value: event.target.value })} required />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.products.addSpec}
              </button>
            </form>
            <ul className="dashboard-notes-list">
              {(detail.specifications ?? []).map((spec) => (
                <li key={spec.id}>
                  <strong>{spec.label ?? spec.key}</strong>: {spec.value}
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() =>
                      void props
                        .onAction(`/dashboard/products/${detail.id}/specifications/${spec.id}`, {}, {
                          method: "DELETE",
                          success: props.copy.messages.productUpdated
                        })
                        .then(() => void openProduct(detail.id))
                    }
                  >
                    {props.copy.actions.delete}
                  </button>
                </li>
              ))}
            </ul>
          </>
          )
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function CategoriesPanel(props: {
  /** Explicit per-module edit gate (categories.write). When false the panel
   *  renders read-only details only: no create form, no slug/status editing. */
  canEdit?: boolean;
  copy: DashboardCopy;
  categories: Category[];
  onAction: ActionHandler;
  onReload: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const canEdit = props.canEdit === true;
  const [input, setInput] = useState({ name: "", slug: "" });
  const [drafts, setDrafts] = useState<Record<string, { slug: string; isActive: boolean }>>({});
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Category & { parentId?: string | null }) | null>(null);
  function openCategory(id: string) {
    setDrawerId(id);
    setDetail(null);
    void props.apiFetch(`/dashboard/categories/${id}`)
      .then((payload) => { setDetail((payload as { data: Category & { parentId?: string | null } }).data); })
      .catch(() => setDetail(null));
  }
  function closeCategory() {
    setDrawerId(null);
    setDetail(null);
  }

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        props.categories.map((category) => [
          category.id,
          { slug: category.slug, isActive: category.isActive !== false }
        ])
      )
    );
  }, [props.categories]);

  return (
    <>
      <PanelHeader title={props.copy.categories.title} copy={props.copy.categories.copy} />
      {canEdit ? <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: input.name,
            onChange: (name) => setInput({ ...input, name, slug: input.slug || slugify(name) })
          },
          {
            label: props.copy.common.slug,
            value: input.slug,
            onChange: (slug) => setInput({ ...input, slug }),
            hint: "页面地址中的英文标识（短横线格式）；留空时按分类名称自动生成"
          }
        ]}
        onSubmit={() =>
          void props
            .onAction("/dashboard/categories", input, { success: props.copy.messages.categoryCreated })
            .then(() => {
              setInput({ name: "", slug: "" });
              return props.onReload();
            })
        }
        title={props.copy.categories.create}
      /> : null}
      <Table
        caption={props.copy.categories.title}
        emptyMessage={`${props.copy.categories.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.common.name,
          props.copy.common.slug,
          props.copy.categories.active,
          props.copy.common.details
        ]}
        rows={props.categories.map((category) => {
          const draft = drafts[category.id] ?? { slug: category.slug, isActive: category.isActive !== false };
          return [
            category.name,
            !canEdit ? category.slug : <form
              key="slug"
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/categories/${category.id}`,
                    { slug: draft.slug, isActive: draft.isActive },
                    { method: "PATCH", success: props.copy.messages.categoryUpdated }
                  )
                  .then(() => props.onReload());
              }}
            >
              <input
                value={draft.slug}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [category.id]: { ...draft, slug: event.target.value }
                  }))
                }
              />
              <label className="field">
                <span>{props.copy.categories.active}</span>
                <input
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [category.id]: { ...draft, isActive: event.target.checked }
                    }))
                  }
                  type="checkbox"
                />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.save}
              </button>
            </form>,
            draft.isActive ? props.copy.common.yes : props.copy.common.no,
            canEdit ? "-" : <button onClick={() => openCategory(category.id)} type="button">查看详情</button>
          ];
        })}
      />
      <DetailDrawer open={Boolean(drawerId && detail)} title={detail?.name ?? ""} onClose={closeCategory}>
        <dl className="category-detail">
          <div><dt>页面网址</dt><dd>{detail?.slug ?? "-"}</dd></div>
          <div><dt>描述</dt><dd>{detail?.description ?? "-"}</dd></div>
          <div><dt>上级分类</dt><dd>{detail?.parentId ?? "-"}</dd></div>
          <div><dt>启用</dt><dd>{detail?.isActive === false ? "否" : "是"}</dd></div>
          <div><dt>分类 ID</dt><dd>{detail?.id ?? "-"}</dd></div>
        </dl>
      </DetailDrawer>
    </>
  );
}

export function PricingPanel(props: {
  /** Explicit per-module edit gate (pricing.write). */
  canEdit?: boolean;
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  prices: Price[];
  products: Product[];
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const [input, setInput] = useState({ skuId: "", amountCents: "", key: "" });
  const [drafts, setDrafts] = useState<Record<string, { amountCents: string; status: string }>>({});
  const skus = props.products.flatMap((product) =>
    (product.skus ?? []).map((sku) => ({ ...sku, productName: product.name }))
  );

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        props.prices.map((price) => [
          price.id,
          { amountCents: String(price.amountCents), status: price.status }
        ])
      )
    );
  }, [props.prices]);

  return (
    <>
      <PanelHeader title={props.copy.pricing.title} copy={props.copy.pricing.copy} />
      {props.canEdit === true ? <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          void props
            .onAction(
              "/dashboard/pricing",
              {
                skuId: input.skuId,
                amountCents: Number(input.amountCents),
                key: input.key || undefined,
                currency: "CAD",
                status: "active"
              },
              { success: props.copy.messages.priceCreated }
            )
            .then(() => {
              setInput({ skuId: "", amountCents: "", key: "" });
              return props.onReload();
            });
        }}
      >
        <h3>{props.copy.pricing.create}</h3>
        <label className="field">
          <span>{props.copy.products.skus}</span>
          <select value={input.skuId} onChange={(event) => setInput({ ...input, skuId: event.target.value })} required>
            <option value="">{props.copy.pricing.selectSku}</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.skuCode} - {sku.productName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{props.copy.pricing.amountCents}</span>
          <input
            inputMode="numeric"
            value={input.amountCents}
            onChange={(event) => setInput({ ...input, amountCents: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>价格类型</span>
          <input value={input.key} onChange={(event) => setInput({ ...input, key: event.target.value })} placeholder="retail" />
          <small className="field-help">价格类型标识，如 retail（零售价）；留空时系统自动生成唯一编号</small>
        </label>
        <button className="button button-primary" type="submit">
          {props.copy.pricing.create}
        </button>
      </form> : null}
      <Table
        caption={props.copy.pricing.title}
        emptyMessage={`${props.copy.pricing.title}: ${props.copy.common.noRecords}`}
        columns={[
          "价格类型",
          props.copy.products.skus,
          props.copy.pricing.amount,
          props.copy.common.status,
          props.copy.common.details
        ]}
        rows={props.prices.map((price) => {
          const draft = drafts[price.id] ?? { amountCents: String(price.amountCents), status: price.status };
          return [
            price.key,
            price.sku?.skuCode ?? "-",
            formatCents(price.amountCents, props.locale, price.currency),
            displayDashboardValue(props.copy, price.status),
            props.readOnly ? "-" : <form
              key="edit"
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/pricing/${price.id}`,
                    { amountCents: Number(draft.amountCents), status: draft.status },
                    { method: "PATCH", success: props.copy.messages.priceUpdated }
                  )
                  .then(() => props.onReload());
              }}
            >
              <input
                inputMode="numeric"
                value={draft.amountCents}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [price.id]: { ...draft, amountCents: event.target.value }
                  }))
                }
              />
              <select
                value={draft.status}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [price.id]: { ...draft, status: event.target.value }
                  }))
                }
              >
                {["active", "inactive", "archived"].map((status) => (
                  <option key={status} value={status}>
                    {displayDashboardValue(props.copy, status)}
                  </option>
                ))}
              </select>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.save}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  void props
                    .onAction(`/dashboard/pricing/${price.id}`, {}, { method: "DELETE", success: props.copy.messages.priceUpdated })
                    .then(() => props.onReload())
                }
              >
                {props.copy.actions.delete}
              </button>
            </form>
          ];
        })}
      />
    </>
  );
}

export function PromotionsPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  copy: DashboardCopy;
  promotions: Promotion[];
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const [input, setInput] = useState({ name: "", key: "", status: "draft" });
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  useEffect(() => {
    setStatusById(Object.fromEntries(props.promotions.map((promotion) => [promotion.id, promotion.status])));
  }, [props.promotions]);

  return (
    <>
      <PanelHeader title={props.copy.promotions.title} copy={props.copy.promotions.copy} />
      {/* V11-R1 F4: effective editable is canEdit (the pricing.write grant);
          readOnly no longer constitutes a block, and no grant means the panel
          stays read-only. New, status select/save and archive/delete share
          the same gate. */}
      {props.canEdit ? <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: input.name,
            onChange: (name) => setInput({ ...input, name, key: input.key || slugify(name) })
          },
          {
            label: "促销标识",
            value: input.key,
            onChange: (key) => setInput({ ...input, key }),
            hint: "系统标识，默认按名称自动生成（英文格式）；创建后用于促销关联"
          }
        ]}
        onSubmit={() =>
          void props
            .onAction("/dashboard/promotions", input, { success: props.copy.messages.promotionCreated })
            .then(() => {
              setInput({ name: "", key: "", status: "draft" });
              return props.onReload();
            })
        }
        title={props.copy.promotions.create}
      /> : null}
      <Table
        caption={props.copy.promotions.title}
        emptyMessage={`${props.copy.promotions.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.common.name,
          "促销标识",
          props.copy.common.status,
          props.copy.promotions.label,
          props.copy.common.details
        ]}
        rows={props.promotions.map((promotion) => [
          promotion.name,
          promotion.key,
          props.canEdit ? <form
            key="status"
            className="dashboard-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void props
                .onAction(
                  `/dashboard/promotions/${promotion.id}`,
                  { status: statusById[promotion.id] ?? promotion.status },
                  { method: "PATCH", success: props.copy.messages.promotionUpdated }
                )
                .then(() => props.onReload());
            }}
          >
            <select
              value={statusById[promotion.id] ?? promotion.status}
              onChange={(event) =>
                setStatusById((current) => ({ ...current, [promotion.id]: event.target.value }))
              }
            >
              {["draft", "active", "archived"].map((status) => (
                <option key={status} value={status}>
                  {displayDashboardStatus(props.copy, "promotion", status)}
                </option>
              ))}
            </select>
            <button className="button button-secondary" type="submit">
              {props.copy.actions.save}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                void props
                  .onAction(`/dashboard/promotions/${promotion.id}`, {}, { method: "DELETE", success: props.copy.messages.promotionUpdated })
                  .then(() => props.onReload())
              }
            >
              {props.copy.actions.delete}
            </button>
          </form> : displayDashboardStatus(props.copy, "promotion", promotion.status),
          promotion.discountLabel ?? "-"
        ])}
      />
    </>
  );
}

export function OrdersPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  dealersDegraded?: boolean;
  copy: DashboardCopy;
  locale: string;
  orders: OrderRecord[];
  dealers: Dealer[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderRecord | null>(null);
  const [orderEditing, setOrderEditing] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [dealerLocationId, setDealerLocationId] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [postalCode, setPostalCode] = useState("");

  const locations = props.dealers.flatMap((dealer) =>
    (dealer.locations ?? []).map((location) => ({
      id: location.id ?? `${dealer.id}-${location.name}`,
      label: `${dealer.name} — ${location.name}`,
      dealerId: dealer.id
    }))
  );

  async function openOrder(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<OrderRecord>>(`/dashboard/orders/${id}`);
    setDetail(payload.data);
    setOrderEditing(false);
    setStatusDraft(payload.data.status);
    setDealerLocationId(payload.data.dealerLocationId ?? "");
    setFulfillment(payload.data.fulfillment);
    setPostalCode("");
    setDrawerId(id);
  }

  return (
    <>
      <PanelHeader title={props.copy.orders.title} copy={props.copy.orders.copy} />
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "pending_payment", label: displayDashboardValue(props.copy, "pending_payment") },
          { value: "paid", label: displayDashboardValue(props.copy, "paid") },
          { value: "processing", label: displayDashboardValue(props.copy, "processing") },
          { value: "fulfilled", label: displayDashboardValue(props.copy, "fulfilled") },
          { value: "cancelled", label: displayDashboardValue(props.copy, "cancelled") },
          { value: "payment_expired", label: displayDashboardValue(props.copy, "payment_expired") }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.orders.title}
        emptyMessage={`${props.copy.orders.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.orders.paymentSessionId,
          props.copy.orders.paymentMethodLabel,
          props.copy.common.customer,
          props.copy.common.status,
          props.copy.common.total,
          props.copy.common.fulfillment,
          props.copy.common.created,
          props.copy.common.details
        ]}
        rows={props.orders.map((order) => [
          <span key="order">
            <strong>{order.paymentSessionId}</strong>
            <small>{order.id}</small>
          </span>,
          props.copy.orders.paymentMethod[order.paymentMethod as keyof typeof props.copy.orders.paymentMethod] ?? order.paymentMethod,
          [order.firstName, order.lastName].filter(Boolean).join(" ") || "-",
          displayDashboardValue(props.copy, order.status),
          formatCents(order.totalCents, props.locale, order.currency),
          displayDashboardValue(props.copy, order.fulfillment),
          formatDate(order.createdAt, props.locale),
          <QueueActionCell
            key="actions"
            actions={[
              { label: props.copy.actions.view, onClick: () => void openOrder(order.id) },
              ...(props.canEdit ? [{ label: "编辑", onClick: () => { void openOrder(order.id).then(() => setOrderEditing(true)); } }] : [])
            ]}
          />
        ])}
      />
      <DetailDrawer
        open={Boolean(drawerId && detail)}
        title={detail ? `${props.copy.orders.orderId} ${detail.id}` : props.copy.orders.title}
        onClose={() => {
          setDrawerId(null);
          setDetail(null);
        }}
      >
        {detail ? (
          <>
            <p>
              <strong>{props.copy.common.customer}:</strong> {detail.email ?? "-"}
            </p>
            {props.dealersDegraded ? <p className="dashboard-form-error" role="alert">{props.copy.orders.dealerUnavailable}</p> : null}
            <h4>{props.copy.orders.items}</h4>
            <Table
              caption={props.copy.orders.items}
              emptyMessage={`${props.copy.orders.items}: ${props.copy.common.noRecords}`}
              columns={[props.copy.products.skuCode, props.copy.common.product, props.copy.common.total]}
              rows={(detail.items ?? []).map((item) => [
                item.skuCode,
                item.productName,
                formatCents(item.lineTotalCents, props.locale, detail.currency)
              ])}
            />
            <h4>{props.copy.orders.statusHistory}</h4>
            <Table
              caption={props.copy.orders.statusHistory}
              emptyMessage={`${props.copy.orders.statusHistory}: ${props.copy.common.noRecords}`}
              columns={[
                props.copy.common.status,
                props.copy.orders.source,
                props.copy.common.created
              ]}
              rows={(detail.statusEvents ?? []).map((event) => [
                displayDashboardValue(props.copy, event.status),
                event.source,
                formatDate(event.createdAt, props.locale)
              ])}
            />
            {!!props.canEdit ? <><form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/orders/${detail.id}/status`,
                    { status: statusDraft },
                    { method: "PATCH", success: props.copy.messages.orderStatusUpdated }
                  )
                  .then(() => void openOrder(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.common.status}</span>
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {["paid", "processing", "fulfilled", "cancelled"].map((status) => (
                    <option key={status} value={status}>
                      {displayDashboardValue(props.copy, status)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-primary" type="submit">
                {props.copy.actions.updateStatus}
              </button>
            </form>
            <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void props
                  .onAction(
                    `/dashboard/orders/${detail.id}/assign-dealer`,
                    { dealerLocationId, fulfillment, postalCode: postalCode || undefined },
                    { success: props.copy.messages.orderAssigned }
                  )
                  .then(() => void openOrder(detail.id))
                  .then(() => props.onReload());
              }}
            >
              <label className="field">
                <span>{props.copy.orders.assignDealer}</span>
                <select
                  value={dealerLocationId}
                  onChange={(event) => setDealerLocationId(event.target.value)}
                  required
                >
                  <option value="">{props.copy.common.select}</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{props.copy.common.fulfillment}</span>
                <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value)}>
                  <option value="pickup">pickup</option>
                  <option value="delivery">delivery</option>
                </select>
              </label>
              <label className="field">
                <span>{props.copy.orders.postalCode}</span>
                <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
              </label>
              <button className="button button-secondary" type="submit">
                {props.copy.actions.assign}
              </button>
            </form></> : null}
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function PaymentSessionsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  sessions: PaymentSessionRecord[];
  meta: PageMeta;
  page: number;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  return (
    <>
      <PanelHeader title={props.copy.paymentSessions.title} copy={props.copy.paymentSessions.copy} />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.paymentSessions.title}
        emptyMessage={`${props.copy.paymentSessions.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.common.email,
          props.copy.common.status,
          props.copy.common.total,
          props.copy.common.fulfillment,
          props.copy.paymentSessions.method,
          props.copy.paymentSessions.expires,
          props.copy.common.created,
          props.copy.paymentSessions.markPaid
        ]}
        rows={props.sessions.map((session) => [
          session.guestEmail,
          displayDashboardValue(props.copy, session.status),
          formatCents(session.totalCents, props.locale, session.currency),
          session.fulfillment ? displayDashboardValue(props.copy, session.fulfillment) : "-",
          session.paymentMethod ?? "-",
          formatDate(session.expiresAt, props.locale),
          formatDate(session.createdAt, props.locale),
          !props.readOnly && session.status === "pending" && session.paymentMethod !== "card" ? (
            <button
              key={`mark-paid-${session.id}`}
              className="button button-secondary"
              type="button"
              onClick={() =>
                void props
                  .onAction(
                    `/dashboard/payment-sessions/${session.id}/mark-paid`,
                    {},
                    { method: "POST", success: props.copy.messages.paymentMarkedPaid }
                  )
                  .then(() => props.onReload())
              }
            >
              {props.copy.paymentSessions.markPaid}
            </button>
          ) : (
            "-"
          )
        ])}
      />
    </>
  );
}

type ErpSyncJobDetail = ErpSyncJobRecord & {
  nextRunAt?: string | null;
  lockedAt?: string | null;
  attempts?: Array<{ id: string; success: boolean; error?: string | null; createdAt: string }>;
};

type ServiceAccountSummary = {
  id: string;
  name: string;
  key: string;
  status: string;
  environment: string;
  roles: string[];
};

export function ErpSyncJobsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  jobs: ErpSyncJobRecord[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  onReload: () => Promise<void>;
  apiFetch?: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErpSyncJobDetail | null>(null);
  const [accounts, setAccounts] = useState<ServiceAccountSummary[] | null>(null);
  useEffect(() => {
    if (!props.apiFetch) return;
    void props.apiFetch("/dashboard/mcp/service-accounts")
      .then((payload) => { setAccounts((payload as { data: ServiceAccountSummary[] }).data ?? []); })
      .catch(() => setAccounts([]));
  }, [props.apiFetch]);
  function openJob(id: string) {
    setDrawerId(id);
    setDetail(null);
    if (!props.apiFetch) return;
    void props.apiFetch(`/dashboard/erp-sync-jobs/${id}`)
      .then((payload) => { setDetail((payload as { data: ErpSyncJobDetail }).data); })
      .catch(() => setDetail(null));
  }
  function closeJob() {
    setDrawerId(null);
    setDetail(null);
  }
  const latest = props.jobs[0];
  const readinessLabel = latest == null
    ? props.copy.erp.neverSynced
    : latest.status === "failed" || latest.status === "retry_wait"
      ? props.copy.erp.attention
      : props.copy.erp.ready;
  return (
    <>
      <PanelHeader title={props.copy.erp.title} copy={props.copy.erp.copy} />
      <section className="dashboard-card erp-readiness-card" aria-label="ERP 系统状态">
        <strong>{props.copy.erp.systemStatus}</strong>
        <span>{readinessLabel}</span>
      </section>
      <section className="dashboard-card erp-accounts-card" aria-label="Service Account 摘要">
        <h3>{props.copy.erp.serviceAccounts}</h3>
        {accounts == null ? (
          <p>{props.copy.common.noRecords}</p>
        ) : accounts.length === 0 ? (
          <p>{props.copy.erp.noServiceAccounts}</p>
        ) : (
          <ul className="erp-accounts-list">
            {accounts.map((account) => (
              <li key={account.id}>
                <strong>{account.name}</strong>
                <span>{displayDashboardValue(props.copy, account.status)} · {displayDashboardValue(props.copy, account.environment)} · {account.roles.length} 个角色</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <QueueStatusFilter
        label={props.copy.common.status}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={[
          { value: "", label: props.copy.handoffs.filterAll },
          { value: "failed", label: displayDashboardValue(props.copy, "failed") },
          { value: "retry_wait", label: displayDashboardValue(props.copy, "retry_wait") },
          { value: "pending", label: displayDashboardValue(props.copy, "pending") }
        ]}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.erp.title}
        emptyMessage={`${props.copy.erp.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.erp.jobType,
          props.copy.common.status,
          props.copy.emailOutbox.attempts,
          props.copy.erp.lastError,
          props.copy.common.created,
          props.copy.common.details
        ]}
        rows={props.jobs.map((job) => [
          <span key="type">
            <strong>{job.type}</strong>
            <small>{job.id}</small>
          </span>,
          displayDashboardValue(props.copy, job.status),
          String(job.attemptCount),
          job.lastError ?? "-",
          formatDate(job.createdAt, props.locale),
          props.readOnly && props.apiFetch ? (
            <button key="details" type="button" onClick={() => openJob(job.id)}>查看详情</button>
          ) : !props.readOnly && (job.status === "failed" || job.status === "retry_wait") ? (
            <button
              key="retry"
              className="button button-secondary"
              type="button"
              onClick={() =>
                void props
                  .onAction(`/dashboard/erp-sync-jobs/${job.id}/retry`, {}, { method: "POST", success: props.copy.messages.erpRetried })
                  .then(() => props.onReload())
              }
            >
              {props.copy.actions.retry}
            </button>
          ) : (
            "-"
          )
        ])}
      />
      <DetailDrawer open={Boolean(drawerId && detail)} title={detail?.type ?? ""} onClose={closeJob}>
        <dl className="erp-job-detail">
          <div><dt>状态</dt><dd>{detail ? displayDashboardValue(props.copy, detail.status) : "-"}</dd></div>
          <div><dt>尝试次数</dt><dd>{detail?.attemptCount ?? "-"}</dd></div>
          <div><dt>最后错误</dt><dd>{detail?.lastError ?? "-"}</dd></div>
          <div><dt>下次运行</dt><dd>{detail?.nextRunAt ? formatDate(detail.nextRunAt, props.locale) : "-"}</dd></div>
          <div><dt>锁定于</dt><dd>{detail?.lockedAt ? formatDate(detail.lockedAt, props.locale) : "-"}</dd></div>
          {detail?.attempts?.length ? (
            <div>
              <dt>尝试记录</dt>
              <dd>
                <ul className="erp-attempts-list">
                  {detail.attempts.map((attempt) => (
                    <li key={attempt.id}>
                      {attempt.success ? "成功" : "失败"} · {formatDate(attempt.createdAt, props.locale)}
                      {attempt.error ? <small> — {attempt.error}</small> : null}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      </DetailDrawer>
    </>
  );
}

export function InventorySnapshotsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  snapshots: InventorySnapshotRecord[];
  products: Product[];
  dealers: Dealer[];
  meta: PageMeta;
  page: number;
  canWrite: boolean;
  onAction: ActionHandler;
  onPageChange: (page: number) => void;
  onReload: () => Promise<void>;
}) {
  const [createInput, setCreateInput] = useState({ skuId: "", dealerLocationId: "", quantityOnHand: "0" });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(props.snapshots.map((snapshot) => [snapshot.id, String(snapshot.quantityOnHand)])));
  }, [props.snapshots]);

  const locations = props.dealers.flatMap((dealer) =>
    (dealer.locations ?? []).map((location) => ({
      id: location.id,
      label: `${dealer.name} — ${location.name}${location.code ? ` (${location.code})` : ""}`
    }))
  );
  const skus = props.products.flatMap((product) =>
    (product.skus ?? []).map((sku) => ({ id: sku.id, label: `${sku.skuCode} — ${product.name}` }))
  );

  return (
    <>
      <PanelHeader title={props.copy.inventory.title} copy={props.copy.inventory.copy} />
      {props.canWrite && !props.readOnly ? (
        <form
          className="dashboard-card dashboard-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            void props
              .onAction(
                "/dashboard/inventory/snapshots",
                {
                  skuId: createInput.skuId,
                  dealerLocationId: createInput.dealerLocationId,
                  quantityOnHand: Number(createInput.quantityOnHand)
                },
                { method: "POST", success: props.copy.messages.inventoryUpdated }
              )
              .then(() => {
                setCreateInput({ skuId: "", dealerLocationId: "", quantityOnHand: "0" });
                return props.onReload();
              });
          }}
        >
          <h3>{props.copy.inventory.createSnapshot}</h3>
          <label className="field">
            <span>{props.copy.products.skus}</span>
            <select
              value={createInput.skuId}
              onChange={(event) => setCreateInput({ ...createInput, skuId: event.target.value })}
              required
            >
              <option value="">{props.copy.common.select}</option>
              {skus.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{props.copy.inventory.location}</span>
            <select
              value={createInput.dealerLocationId}
              onChange={(event) => setCreateInput({ ...createInput, dealerLocationId: event.target.value })}
              required
            >
              <option value="">{props.copy.common.select}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{props.copy.inventory.onHand}</span>
            <input
              type="number"
              min={0}
              value={createInput.quantityOnHand}
              onChange={(event) => setCreateInput({ ...createInput, quantityOnHand: event.target.value })}
              required
            />
          </label>
          <button className="button button-primary" type="submit">
            {props.copy.inventory.saveInventory}
          </button>
        </form>
      ) : null}
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.inventory.title}
        emptyMessage={`${props.copy.inventory.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.products.skus,
          props.copy.inventory.location,
          props.copy.inventory.onHand,
          props.copy.inventory.reserved,
          props.copy.inventory.available,
          props.copy.inventory.adjust
        ]}
        rows={props.snapshots.map((snapshot) => [
          <span key="sku">
            <strong>{snapshot.sku?.skuCode ?? "-"}</strong>
            <small>{snapshot.sku?.product?.name ?? snapshot.sku?.name ?? "-"}</small>
          </span>,
          snapshot.dealerLocation
            ? `${snapshot.dealerLocation.name} (${snapshot.dealerLocation.code})`
            : "-",
          props.canWrite && !props.readOnly ? (
            <input
              key="onHand"
              type="number"
              min={snapshot.quantityReserved}
              value={drafts[snapshot.id] ?? String(snapshot.quantityOnHand)}
              onChange={(event) => setDrafts((current) => ({ ...current, [snapshot.id]: event.target.value }))}
            />
          ) : (
            String(snapshot.quantityOnHand)
          ),
          String(snapshot.quantityReserved),
          String(snapshot.quantityAvailable),
          props.canWrite && !props.readOnly ? (
            <button
              key="save"
              className="button button-secondary"
              type="button"
              onClick={() =>
                void props.onAction(
                  `/dashboard/inventory/snapshots/${snapshot.id}`,
                  { quantityOnHand: Number(drafts[snapshot.id] ?? snapshot.quantityOnHand) },
                  { method: "PATCH", success: props.copy.messages.inventoryUpdated }
                ).then(() => props.onReload())
              }
            >
              {props.copy.inventory.adjust}
            </button>
          ) : (
            "-"
          )
        ])}
      />
    </>
  );
}

function CmsReadonlyJson(props: {
  copy: DashboardCopy;
  title: string;
  locale?: SiteLocale;
  data: unknown;
}) {
  return (
    <section className="dashboard-card dashboard-quick-form">
      <h3>{props.title}</h3>
      <div className="field">
        <span>{props.copy.common.jsonPayload}</span>
        <pre lang={props.locale}>{cmsEditorValue(props.data)}</pre>
      </div>
    </section>
  );
}

function CmsJsonEditor(props: {
  copy: DashboardCopy;
  title: string;
  endpoint: string;
  locale: SiteLocale;
  data: unknown;
  canWrite: boolean;
  onAction: ActionHandler;
}) {
  const [jsonDraft, setJsonDraft] = useState(() => cmsEditorValue(props.data));

  useEffect(() => {
    setJsonDraft(cmsEditorValue(props.data));
  }, [props.data]);

  if (!props.canWrite) {
    return <CmsReadonlyJson copy={props.copy} title={props.title} locale={props.locale} data={props.data} />;
  }

  return (
    <form
      className="dashboard-card dashboard-quick-form"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!props.canWrite) return;
        let payload: unknown;
        try {
          payload = JSON.parse(jsonDraft);
        } catch {
          return;
        }
        void props.onAction(
          props.endpoint,
          { locale: props.locale, status: "published", payload },
          { method: "PUT", success: props.copy.messages.contentSaved }
        );
      }}
    >
      <h3>{props.title}</h3>
      <label className="field">
        <span>{props.copy.common.jsonPayload}</span>
        <textarea
          rows={16}
          value={jsonDraft}
          onChange={(event) => setJsonDraft(event.target.value)}
          readOnly={!props.canWrite}
        />
      </label>
      {props.canWrite ? (
        <button className="button button-primary" type="submit">
          {props.copy.actions.save}
        </button>
      ) : null}
    </form>
  );
}

export function CmsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  cmsSubTab: CmsSubTab;
  onSubTabChange: (tab: CmsSubTab) => void;
  cmsLocale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  cmsNavigation: unknown;
  cmsHomePage: unknown;
  cmsFooter: unknown;
  cmsCatalogConfig: unknown;
  cmsStorefrontConfig: unknown;
  moduleReadiness: unknown;
  legalPages: LegalPageSummary[];
  articles: ArticleRecord[];
  canWrite: boolean;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [legalTitle, setLegalTitle] = useState("");
  const [legalBody, setLegalBody] = useState("");
  const [articleInput, setArticleInput] = useState({ slug: "", title: "", locale: props.cmsLocale });

  const subTabs: Array<{ key: CmsSubTab; label: string }> = [
    { key: "navigation", label: props.copy.cms.navigation },
    { key: "homePage", label: props.copy.cms.homePage },
    { key: "footer", label: props.copy.cms.footer },
    { key: "legalPages", label: props.copy.cms.legalPages },
    { key: "articles", label: props.copy.cms.articles },
    { key: "catalogConfig", label: props.copy.cms.catalogConfig },
    { key: "storefrontConfig", label: props.copy.cms.storefrontConfig },
    { key: "moduleReadiness", label: props.copy.cms.readiness }
  ];

  async function openLegalPage(slug: string) {
    const payload = await props.apiFetch<ApiEnvelope<{ title: string; sections: unknown }>>(
      `/dashboard/legal-pages/${slug}?locale=${props.cmsLocale}`
    );
    setLegalSlug(slug);
    setLegalTitle(payload.data.title);
    setLegalBody(JSON.stringify(payload.data.sections ?? [], null, 2));
  }

  return (
    <>
      <PanelHeader title={props.copy.cms.title} copy={props.copy.cms.copy} />
      <div className="dashboard-row-actions">
        <label className="dashboard-filter">
          <span>{props.copy.common.locale}</span>
          <select
            value={props.cmsLocale}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "en-CA" || value === "fr-CA") {
                props.onLocaleChange(value);
              }
            }}
          >
            <option value="en-CA">en-CA</option>
            <option value="fr-CA">fr-CA</option>
          </select>
        </label>
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            aria-pressed={tab.key === props.cmsSubTab}
            className={tab.key === props.cmsSubTab ? "button button-primary" : "button button-secondary"}
            onClick={() => props.onSubTabChange(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {props.cmsSubTab === "navigation" ? (
        <CmsJsonEditor
          copy={props.copy}
          title={props.copy.cms.navigation}
          endpoint="/dashboard/navigation"
          locale={props.cmsLocale}
          data={props.cmsNavigation}
          canWrite={props.canWrite && !props.readOnly}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "homePage" ? (
        <CmsJsonEditor
          copy={props.copy}
          title={props.copy.cms.homePage}
          endpoint="/dashboard/home-page"
          locale={props.cmsLocale}
          data={props.cmsHomePage}
          canWrite={props.canWrite && !props.readOnly}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "footer" ? (
        <CmsJsonEditor
          copy={props.copy}
          title={props.copy.cms.footer}
          endpoint="/dashboard/footer"
          locale={props.cmsLocale}
          data={props.cmsFooter}
          canWrite={props.canWrite && !props.readOnly}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "catalogConfig" ? (
        <CmsJsonEditor
          copy={props.copy}
          title={props.copy.cms.catalogConfig}
          endpoint="/dashboard/catalog"
          locale={props.cmsLocale}
          data={props.cmsCatalogConfig}
          canWrite={props.canWrite && !props.readOnly}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "storefrontConfig" ? (
        <CmsJsonEditor
          copy={props.copy}
          title={props.copy.cms.storefrontConfig}
          endpoint="/dashboard/storefront/config"
          locale={props.cmsLocale}
          data={props.cmsStorefrontConfig}
          canWrite={props.canWrite && !props.readOnly}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "moduleReadiness" ? (
        <CmsReadonlyJson
          copy={props.copy}
          title={props.copy.cms.readiness}
          data={props.moduleReadiness}
        />
      ) : null}

      {props.cmsSubTab === "legalPages" ? (
        <div className="dashboard-form-grid">
          <Table
            caption={props.copy.cms.legalPages}
            emptyMessage={`${props.copy.cms.legalPages}: ${props.copy.common.noRecords}`}
            columns={[
              props.copy.cms.slug,
              props.copy.cms.titleField,
              props.copy.common.status,
              props.copy.common.locale,
              props.copy.common.details
            ]}
            rows={props.legalPages.map((page) => [
              page.slug,
              <span key="title" lang={page.locale}>{page.title}</span>,
              displayDashboardValue(props.copy, page.status),
              page.locale,
              !props.readOnly ? <button
                key="edit"
                className="button button-secondary"
                type="button"
                onClick={() => void openLegalPage(page.slug)}
              >
                {props.copy.actions.edit}
              </button> : "-"
            ])}
          />
          {!props.readOnly && legalSlug ? (
            <form
              className="dashboard-card dashboard-quick-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!props.canWrite || props.readOnly) return;
                let sections: unknown;
                try {
                  sections = JSON.parse(legalBody);
                } catch {
                  return;
                }
                void props
                  .onAction(
                    `/dashboard/legal-pages/${legalSlug}`,
                    { locale: props.cmsLocale, title: legalTitle, sections, status: "published" },
                    { method: "PUT", success: props.copy.messages.contentSaved }
                  )
                  .then(() => props.onReload());
              }}
            >
              <h3>
                {props.copy.cms.legalPages}: {legalSlug}
              </h3>
              <label className="field">
                <span>{props.copy.cms.titleField}</span>
                <input value={legalTitle} onChange={(event) => setLegalTitle(event.target.value)} required />
              </label>
              <label className="field">
                <span>{props.copy.cms.body}</span>
                <textarea rows={12} value={legalBody} onChange={(event) => setLegalBody(event.target.value)} />
              </label>
              {props.canWrite && !props.readOnly ? (
                <button className="button button-primary" type="submit">
                  {props.copy.actions.save}
                </button>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {props.cmsSubTab === "articles" ? (
        <>
          {props.canWrite && !props.readOnly ? (
            <QuickForm
              fields={[
                { label: props.copy.cms.slug, value: articleInput.slug, onChange: (slug) => setArticleInput({ ...articleInput, slug }), hint: "页面地址中的英文标识（短横线格式）；留空时按标题自动生成" },
                { label: props.copy.cms.titleField, value: articleInput.title, onChange: (title) => setArticleInput({ ...articleInput, title, slug: articleInput.slug || slugify(title) }) },
                { label: props.copy.common.locale, value: articleInput.locale, onChange: (locale) => {
                    if (locale === "en-CA" || locale === "fr-CA") {
                      setArticleInput({ ...articleInput, locale });
                    }
                  } }
              ]}
              onSubmit={() =>
                void props
                  .onAction(
                    "/dashboard/articles",
                    {
                      slug: articleInput.slug,
                      title: articleInput.title,
                      locale: articleInput.locale,
                      status: "draft",
                      body: { blocks: [] }
                    },
                    { success: props.copy.messages.articleCreated }
                  )
                  .then(() => {
                    setArticleInput({ slug: "", title: "", locale: props.cmsLocale });
                    return props.onReload();
                  })
              }
              title={props.copy.cms.articles}
            />
          ) : null}
          <Table
            caption={props.copy.cms.articles}
            emptyMessage={`${props.copy.cms.articles}: ${props.copy.common.noRecords}`}
            columns={[props.copy.cms.slug, props.copy.cms.titleField, props.copy.common.status, props.copy.common.locale]}
            rows={props.articles.map((article) => [
              article.slug,
              <span key="title" lang={article.locale}>{article.title}</span>,
              displayDashboardValue(props.copy, article.status),
              article.locale
            ])}
          />
        </>
      ) : null}
    </>
  );
}

export function OperationsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  alerts: OperationalAlert[];
  analyticsSummary: AnalyticsSummary | null;
  onNavigateAlert: (alertKey: string) => void;
}) {
  const summary = props.analyticsSummary;
  return (
    <>
      <PanelHeader title={props.copy.operations.title} copy={props.copy.operations.copy} />
      {summary ? (
        <>
          <PanelHeader title={props.copy.operations.analyticsTitle} copy={props.copy.operations.analyticsCopy} />
          <div className="dashboard-stats">
            <div className="dashboard-card">
              <strong>{props.copy.operations.pageViews}</strong>
              <p>{summary.pageViews}</p>
            </div>
            <div className="dashboard-card">
              <strong>{props.copy.operations.uniqueSessions}</strong>
              <p>{summary.uniqueSessions}</p>
            </div>
            <div className="dashboard-card">
              <strong>{props.copy.operations.checkoutSessions}</strong>
              <p>{summary.funnel.checkoutSessions}</p>
            </div>
            <div className="dashboard-card">
              <strong>{props.copy.operations.paidOrders}</strong>
              <p>{summary.funnel.paidOrders}</p>
            </div>
          </div>
          <Table
            caption={props.copy.operations.topPaths}
            emptyMessage={`${props.copy.operations.topPaths}: ${props.copy.common.noRecords}`}
            columns={[props.copy.operations.topPaths, props.copy.operations.count]}
            rows={summary.topPaths.map((row) => [row.path, String(row.count)])}
          />
        </>
      ) : null}
      <Table
        caption={props.copy.operations.title}
        emptyMessage={props.copy.operations.empty}
        columns={[
          props.copy.operations.severity,
          props.copy.operations.alert,
          props.copy.operations.count,
          props.copy.operations.queue
        ]}
        rows={props.alerts.map((alert) => [
          displayDashboardValue(props.copy, alert.severity),
          alert.title,
          String(alert.count),
          props.readOnly ? (
            <span key="queue">{props.copy.operations.queue}</span>
          ) : (
            <button
              key="queue"
              className="button button-secondary"
              type="button"
              onClick={() => props.onNavigateAlert(alert.key)}
            >
              {props.copy.actions.openQueue}
            </button>
          )
        ])}
      />
    </>
  );
}

export function EmailOutboxPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  items: EmailOutboxItem[];
  meta: PageMeta;
  page: number;
  onPageChange: (page: number) => void;
  templates: EmailTemplateItem[];
  emailProvider: EmailProviderAccount | null;
  canWriteProvider: boolean;
  canWriteTemplates: boolean;
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const settings = props.emailProvider?.settings ?? {};
  const [providerForm, setProviderForm] = useState({
    host: typeof settings.host === "string" ? settings.host : "",
    port: String(typeof settings.port === "number" ? settings.port : 587),
    user: typeof settings.user === "string" ? settings.user : "",
    password: typeof settings.password === "string" ? settings.password : "",
    from: typeof settings.from === "string" ? settings.from : "",
    requireTls: settings.requireTls !== false,
    status: props.emailProvider?.status === "enabled" ? "enabled" : "disabled",
    testTo: ""
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = props.templates.find((template) => template.id === selectedTemplateId) ?? null;
  const latestVersion = selectedTemplate?.versions?.[0];
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    bodyText: "",
    bodyHtml: ""
  });

  useEffect(() => {
    const next = props.emailProvider?.settings ?? {};
    setProviderForm((current) => ({
      ...current,
      host: typeof next.host === "string" ? next.host : "",
      port: String(typeof next.port === "number" ? next.port : 587),
      user: typeof next.user === "string" ? next.user : "",
      password: typeof next.password === "string" ? next.password : "",
      from: typeof next.from === "string" ? next.from : "",
      requireTls: next.requireTls !== false,
      status: props.emailProvider?.status === "enabled" ? "enabled" : "disabled"
    }));
  }, [props.emailProvider]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const version = selectedTemplate.versions?.[0];
    setTemplateForm({
      name: selectedTemplate.name,
      subject: version?.subject ?? "",
      bodyText: version?.bodyText ?? "",
      bodyHtml: version?.bodyHtml ?? ""
    });
  }, [selectedTemplate]);

  return (
    <>
      <PanelHeader title={props.copy.emailProvider.title} copy={props.copy.emailProvider.copy} />
      {!props.readOnly ? <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.canWriteProvider) return;
          void props
            .onAction(
              "/dashboard/email/provider",
              {
                host: providerForm.host,
                port: Number(providerForm.port),
                user: providerForm.user,
                password: providerForm.password,
                from: providerForm.from,
                requireTls: providerForm.requireTls,
                status: providerForm.status
              },
              { method: "PUT", success: props.copy.messages.emailProviderSaved }
            )
            .then(() => props.onReload());
        }}
      >
        <label className="field">
          <span>{props.copy.emailProvider.host}</span>
          <input
            value={providerForm.host}
            onChange={(event) => setProviderForm({ ...providerForm, host: event.target.value })}
            disabled={!props.canWriteProvider}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.port}</span>
          <input
            type="number"
            value={providerForm.port}
            onChange={(event) => setProviderForm({ ...providerForm, port: event.target.value })}
            disabled={!props.canWriteProvider}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.user}</span>
          <input
            value={providerForm.user}
            onChange={(event) => setProviderForm({ ...providerForm, user: event.target.value })}
            disabled={!props.canWriteProvider}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.password}</span>
          <input
            type="password"
            value={providerForm.password}
            onChange={(event) => setProviderForm({ ...providerForm, password: event.target.value })}
            disabled={!props.canWriteProvider}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.from}</span>
          <input
            value={providerForm.from}
            onChange={(event) => setProviderForm({ ...providerForm, from: event.target.value })}
            disabled={!props.canWriteProvider}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.status}</span>
          <select
            value={providerForm.status}
            onChange={(event) => setProviderForm({ ...providerForm, status: event.target.value })}
            disabled={!props.canWriteProvider}
          >
            <option value="enabled">{props.copy.emailProvider.enabled}</option>
            <option value="disabled">{props.copy.emailProvider.disabled}</option>
          </select>
        </label>
        <label className="field">
          <span>{props.copy.emailProvider.requireTls}</span>
          <input
            type="checkbox"
            checked={providerForm.requireTls}
            onChange={(event) => setProviderForm({ ...providerForm, requireTls: event.target.checked })}
            disabled={!props.canWriteProvider}
          />
        </label>
        {props.canWriteProvider ? (
          <button className="button button-primary" type="submit">
            {props.copy.emailProvider.save}
          </button>
        ) : null}
      </form> : null}
      {!props.readOnly && props.canWriteProvider ? (
        <form
          className="dashboard-inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void props
              .onAction(
                "/dashboard/email/provider/test",
                { toEmail: providerForm.testTo },
                { method: "POST", success: props.copy.messages.emailProviderTestQueued }
              )
              .then(() => props.onReload());
          }}
        >
          <label className="field">
            <span>{props.copy.emailProvider.testTo}</span>
            <input
              type="email"
              value={providerForm.testTo}
              onChange={(event) => setProviderForm({ ...providerForm, testTo: event.target.value })}
              required
            />
          </label>
          <button className="button button-secondary" type="submit">
            {props.copy.emailProvider.test}
          </button>
        </form>
      ) : null}

      <PanelHeader title={props.copy.emailOutbox.title} copy={props.copy.emailOutbox.copy} />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.emailOutbox.title}
        emptyMessage={`${props.copy.emailOutbox.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.emailOutbox.template,
          props.copy.emailOutbox.recipient,
          props.copy.common.status,
          props.copy.emailOutbox.attempts,
          props.copy.emailOutbox.lastError,
          props.copy.common.created,
          props.copy.emailOutbox.retry
        ]}
        rows={props.items.map((item) => [
          item.templateKey ?? "-",
          item.toEmail,
          displayDashboardValue(props.copy, item.status),
          String(item.attemptCount),
          item.lastError ?? "-",
          formatDate(item.createdAt, props.locale),
          !props.readOnly && (item.status === "failed" || item.status === "retry_wait") ? (
            <button
              key={`retry-${item.id}`}
              className="button button-secondary"
              type="button"
              onClick={() =>
                void props
                  .onAction(`/dashboard/email/outbox/${item.id}/retry`, {}, { method: "POST", success: props.copy.messages.emailRetried })
                  .then(() => props.onReload())
              }
            >
              {props.copy.emailOutbox.retry}
            </button>
          ) : (
            "-"
          )
        ])}
      />
      <PanelHeader title={props.copy.emailOutbox.templatesTitle} copy={props.copy.emailOutbox.templatesCopy} />
      <Table
        caption={props.copy.emailOutbox.templatesTitle}
        emptyMessage={`${props.copy.emailOutbox.templatesTitle}: ${props.copy.common.noRecords}`}
        columns={[
          "模板标识",
          props.copy.common.name,
          props.copy.emailOutbox.subject,
          props.copy.emailOutbox.version,
          props.copy.emailOutbox.editTemplate
        ]}
        rows={props.templates.map((template) => {
          const version = template.versions?.[0];
          return [
            template.key,
            template.name,
            version?.subject ?? "-",
            version ? String(version.version) : "-",
            !props.readOnly ? <button
              key={`edit-${template.id}`}
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedTemplateId(template.id)}
            >
              {props.copy.emailOutbox.editTemplate}
            </button> : "-"
          ];
        })}
      />
      {!props.readOnly && selectedTemplate && props.canWriteTemplates ? (
        <form
          className="dashboard-card dashboard-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            void props
              .onAction(
                `/dashboard/email/templates/${selectedTemplate.id}`,
                { name: templateForm.name },
                { method: "PATCH", success: props.copy.messages.emailTemplatePublished }
              )
              .then(() =>
                props.onAction(
                  `/dashboard/email/templates/${selectedTemplate.id}/versions`,
                  {
                    subject: templateForm.subject,
                    bodyText: templateForm.bodyText || undefined,
                    bodyHtml: templateForm.bodyHtml || undefined,
                    publish: true
                  },
                  { method: "POST", success: props.copy.messages.emailTemplatePublished }
                )
              )
              .then(() => props.onReload());
          }}
        >
          <h3>
            {selectedTemplate.key}
            {latestVersion ? ` · v${latestVersion.version}` : ""}
          </h3>
          <label className="field">
            <span>{props.copy.common.name}</span>
            <input
              value={templateForm.name}
              onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>{props.copy.emailOutbox.subject}</span>
            <input
              value={templateForm.subject}
              onChange={(event) => setTemplateForm({ ...templateForm, subject: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>{props.copy.emailOutbox.bodyText}</span>
            <textarea
              value={templateForm.bodyText}
              onChange={(event) => setTemplateForm({ ...templateForm, bodyText: event.target.value })}
              rows={6}
            />
          </label>
          <label className="field">
            <span>{props.copy.emailOutbox.bodyHtml}</span>
            <textarea
              value={templateForm.bodyHtml}
              onChange={(event) => setTemplateForm({ ...templateForm, bodyHtml: event.target.value })}
              rows={6}
            />
          </label>
          <button className="button button-primary" type="submit">
            {props.copy.emailOutbox.publish}
          </button>
        </form>
      ) : null}
    </>
  );
}

export function AuditLogsPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  locale: string;
  logs: AuditLogRecord[];
  meta: PageMeta;
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <PanelHeader title={props.copy.auditLogs.title} copy={props.copy.auditLogs.copy} />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.auditLogs.title}
        emptyMessage={`${props.copy.auditLogs.title}: ${props.copy.common.noRecords}`}
        columns={[
          props.copy.auditLogs.action,
          props.copy.auditLogs.resource,
          props.copy.auditLogs.resourceId,
          props.copy.common.created
        ]}
        rows={props.logs.map((log) => [
          log.action,
          log.resourceType,
          log.resourceId ?? "-",
          formatDate(log.createdAt, props.locale)
        ])}
      />
    </>
  );
}

const CANADIAN_PROVINCE_OPTIONS = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

type AddressDraft = {
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const emptyAddressDraft: AddressDraft = {
  label: "", firstName: "", lastName: "", phone: "",
  addressLine1: "", addressLine2: "", city: "", province: "",
  postalCode: "", country: "CA"
};

export function UsersPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  copy: DashboardCopy;
  input: { email: string; displayName: string; password: string; roleId: string };
  onChange: (value: { email: string; displayName: string; password: string; roleId: string }) => void;
  onSubmit: () => void;
  roles: Role[];
  users: AdminUser[];
  apiFetch: (path: string, init?: RequestInit) => Promise<unknown>;
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [userStatusDraft, setUserStatusDraft] = useState("active");
  const [userDisplayNameDraft, setUserDisplayNameDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [customerDraft, setCustomerDraft] = useState({ firstName: "", lastName: "", phone: "" });
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddressDraft);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressEditDrafts, setAddressEditDrafts] = useState<Record<string, AddressDraft>>({});
  function openUser(id: string) {
    setDrawerId(id);
    setDetail(null);
    setActionError(null);
    setEditingAddressId(null);
    void props.apiFetch(`/dashboard/users/${id}`)
      .then((payload) => {
        const user = (payload as { data: AdminUser }).data;
        setDetail(user);
        setUserStatusDraft(user.status);
        setUserDisplayNameDraft(user.adminProfile?.displayName ?? "");
        setCustomerDraft({
          firstName: user.customerProfile?.firstName ?? "",
          lastName: user.customerProfile?.lastName ?? "",
          phone: user.customerProfile?.phone ?? ""
        });
      })
      .catch(() => setDetail(null));
  }
  function closeUser() {
    setDrawerId(null);
    setDetail(null);
    setEditingAddressId(null);
    setActionError(null);
  }
  function submitUserAction(path: string, body: Record<string, unknown>, options: { method?: string; success: string }) {
    void Promise.resolve(props.onAction(path, body, options))
      .then(() => {
        setActionError(null);
        if (detail) void openUser(detail.id);
        void props.onReload();
      })
      .catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "操作失败，请重试。");
      });
  }
  function beginAddressEdit(address: { id: string; label?: string | null; firstName: string; lastName: string; phone?: string | null; addressLine1: string; addressLine2?: string | null; city: string; province: string; postalCode: string; country: string }) {
    setEditingAddressId(address.id);
    setAddressEditDrafts((current) => ({
      ...current,
      [address.id]: {
        label: address.label ?? "",
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone ?? "",
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? "",
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
        country: address.country
      }
    }));
  }
  function saveAddressEdit(addressId: string) {
    const draft = addressEditDrafts[addressId];
    if (!draft) return;
    const body: Record<string, unknown> = {
      label: draft.label, firstName: draft.firstName, lastName: draft.lastName, phone: draft.phone,
      addressLine1: draft.addressLine1, addressLine2: draft.addressLine2, city: draft.city,
      province: draft.province, postalCode: draft.postalCode, country: draft.country
    };
    if (detail) submitUserAction(`/dashboard/users/${detail.id}/addresses/${addressId}`, body, { method: "PATCH", success: props.copy.messages.addressUpdated });
    setEditingAddressId(null);
  }
  function createAddress() {
    if (!detail) return;
    const body: Record<string, unknown> = {
      label: addressDraft.label, firstName: addressDraft.firstName, lastName: addressDraft.lastName, phone: addressDraft.phone,
      addressLine1: addressDraft.addressLine1, addressLine2: addressDraft.addressLine2, city: addressDraft.city,
      province: addressDraft.province, postalCode: addressDraft.postalCode, country: addressDraft.country,
      isDefault: (detail.addresses ?? []).length === 0
    };
    submitUserAction(`/dashboard/users/${detail.id}/addresses`, body, { method: "POST", success: props.copy.messages.addressAdded });
    setAddressDraft(emptyAddressDraft);
  }
  function setDefaultAddress(address: { id: string }) {
    if (!detail) return;
    submitUserAction(`/dashboard/users/${detail.id}/addresses/${address.id}`, { isDefault: true }, { method: "PATCH", success: props.copy.messages.defaultAddressSet });
  }
  function deleteAddress(address: { id: string; label?: string | null; addressLine1: string }) {
    if (!detail) return;
    const name = address.label || address.addressLine1;
    if (!window.confirm(`确认删除地址「${name}」？`)) return;
    submitUserAction(`/dashboard/users/${detail.id}/addresses/${address.id}`, {}, { method: "DELETE", success: props.copy.messages.addressDeleted });
  }
  const isCustomer = detail?.kind === "customer";
  return (
    <>
      <PanelHeader title={props.copy.users.title} copy={props.copy.users.copy} />
      {!props.readOnly ? <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <h3>{props.copy.users.create}</h3>
        <label className="field">
          <span>{props.copy.common.email}</span>
          <input
            type="email"
            value={props.input.email}
            onChange={(event) => props.onChange({ ...props.input, email: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.users.displayName}</span>
          <input
            value={props.input.displayName}
            onChange={(event) => props.onChange({ ...props.input, displayName: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{props.copy.users.temporaryPassword}</span>
          <input
            type="password"
            value={props.input.password}
            onChange={(event) => props.onChange({ ...props.input, password: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.common.role}</span>
          <select
            value={props.input.roleId}
            onChange={(event) => props.onChange({ ...props.input, roleId: event.target.value })}
          >
            <option value="">{props.copy.users.noRole}</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit">
          {props.copy.users.createButton}
        </button>
      </form> : null}
      <Table
        caption={props.copy.users.title}
        emptyMessage={`${props.copy.users.title}: ${props.copy.common.noRecords}`}
        columns={[props.copy.common.email, props.copy.common.status, props.copy.users.kind, props.copy.users.roles, props.copy.common.details]}
        rows={props.users.map((user) => [
          user.email,
          displayDashboardValue(props.copy, user.status),
          displayDashboardValue(props.copy, user.kind),
          user.userRoles?.map((role) => role.role.key).join(", ") || "-",
          <button onClick={() => openUser(user.id)} type="button">查看详情</button>
        ])}
      />
      <DetailDrawer open={Boolean(drawerId && detail)} title={detail?.email ?? ""} onClose={closeUser}>
        <dl className="user-detail">
          <div><dt>邮箱</dt><dd>{detail?.email ?? "-"}</dd></div>
          <div><dt>类型</dt><dd>{detail ? displayDashboardValue(props.copy, detail.kind) : "-"}</dd></div>
          <div><dt>状态</dt><dd>{detail ? displayDashboardValue(props.copy, detail.status) : "-"}</dd></div>
          <div><dt>角色</dt><dd>{detail?.userRoles?.map((role) => role.role.name).join("、") || "-"}</dd></div>
        </dl>
        {actionError ? <p className="dashboard-form-error" role="alert">{actionError}</p> : null}

        {detail?.kind === "admin" ? (
          <>
            <h4>{props.copy.users.adminProfile}</h4>
            <dl className="user-detail">
              <div><dt>{props.copy.users.displayName}</dt><dd>{detail.adminProfile?.displayName ?? "-"}</dd></div>
            </dl>
            {props.canEdit === true ? (
              <form
                className="dashboard-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitUserAction(`/dashboard/users/${detail.id}`, { status: userStatusDraft, displayName: userDisplayNameDraft }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
                }}
              >
                <label className="field">
                  <span>{props.copy.users.displayName}</span>
                  <input value={userDisplayNameDraft} onChange={(event) => setUserDisplayNameDraft(event.target.value)} />
                </label>
                <label className="field">
                  <span>{props.copy.common.status}</span>
                  <select value={userStatusDraft} onChange={(event) => setUserStatusDraft(event.target.value)}>
                    {["active", "suspended"].map((status) => (
                      <option key={status} value={status}>{displayDashboardValue(props.copy, status)}</option>
                    ))}
                  </select>
                </label>
                <button className="button button-primary" type="submit">{props.copy.actions.save}</button>
              </form>
            ) : null}
          </>
        ) : null}

        {isCustomer ? (
          <>
            <h4>{props.copy.users.customerProfile}</h4>
            <dl className="user-detail">
              <div><dt>{props.copy.common.firstName}</dt><dd>{detail?.customerProfile?.firstName || "-"}</dd></div>
              <div><dt>{props.copy.common.lastName}</dt><dd>{detail?.customerProfile?.lastName || "-"}</dd></div>
              <div><dt>{props.copy.common.phone}</dt><dd>{detail?.customerProfile?.phone || "-"}</dd></div>
            </dl>
            {props.canEdit === true ? (
              <form
                className="dashboard-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitUserAction(`/dashboard/users/${detail.id}`, { firstName: customerDraft.firstName, lastName: customerDraft.lastName, phone: customerDraft.phone }, { method: "PATCH", success: props.copy.messages.customerProfileUpdated });
                }}
              >
                <label className="field">
                  <span>{props.copy.common.firstName}</span>
                  <input value={customerDraft.firstName} onChange={(event) => setCustomerDraft((current) => ({ ...current, firstName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{props.copy.common.lastName}</span>
                  <input value={customerDraft.lastName} onChange={(event) => setCustomerDraft((current) => ({ ...current, lastName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{props.copy.common.phone}</span>
                  <input value={customerDraft.phone} onChange={(event) => setCustomerDraft((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <button className="button button-primary" type="submit">{props.copy.users.saveProfile}</button>
              </form>
            ) : null}

            <h4>{props.copy.users.addressBook}</h4>
            {!detail?.addresses?.length ? <p>{props.copy.common.noRecords}</p> : (
              <ul className="dashboard-notes-list">
                {detail.addresses.map((address) => (
                  <li key={address.id}>
                    <strong>{address.label || [address.firstName, address.lastName].filter(Boolean).join(" ") || "-"}</strong>
                    {address.isDefault ? <small>（{props.copy.users.defaultAddress}）</small> : null}
                    <small>{[address.addressLine1, address.addressLine2].filter(Boolean).join("，")}</small>
                    <small>{[address.city, address.province, address.postalCode, address.country].filter(Boolean).join(" · ")}</small>
                    <small>{[address.firstName, address.lastName].filter(Boolean).join(" ")}{address.phone ? ` · ${address.phone}` : ""}</small>
                    {editingAddressId === address.id ? (
                      <form
                        className="dashboard-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveAddressEdit(address.id);
                        }}
                      >
                        <label className="field">
                          <span>{props.copy.users.label}</span>
                          <input value={addressEditDrafts[address.id]?.label ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), label: event.target.value } }))} />
                        </label>
                        <label className="field">
                          <span>{props.copy.common.firstName}</span>
                          <input value={addressEditDrafts[address.id]?.firstName ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), firstName: event.target.value } }))} required />
                        </label>
                        <label className="field">
                          <span>{props.copy.common.lastName}</span>
                          <input value={addressEditDrafts[address.id]?.lastName ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), lastName: event.target.value } }))} required />
                        </label>
                        <label className="field">
                          <span>{props.copy.common.phone}</span>
                          <input value={addressEditDrafts[address.id]?.phone ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), phone: event.target.value } }))} />
                        </label>
                        <label className="field">
                          <span>{props.copy.users.addressLine1}</span>
                          <input value={addressEditDrafts[address.id]?.addressLine1 ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), addressLine1: event.target.value } }))} required />
                        </label>
                        <label className="field">
                          <span>{props.copy.users.addressLine2}</span>
                          <input value={addressEditDrafts[address.id]?.addressLine2 ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), addressLine2: event.target.value } }))} />
                        </label>
                        <label className="field">
                          <span>{props.copy.users.city}</span>
                          <input value={addressEditDrafts[address.id]?.city ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), city: event.target.value } }))} required />
                        </label>
                        <label className="field">
                          <span>{props.copy.users.province}</span>
                          <select value={addressEditDrafts[address.id]?.province ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), province: event.target.value } }))} required>
                            <option value="">{props.copy.common.select}</option>
                            {CANADIAN_PROVINCE_OPTIONS.map((province) => (
                              <option key={province} value={province}>{province}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>{props.copy.users.postalCode}</span>
                          <input value={addressEditDrafts[address.id]?.postalCode ?? ""} onChange={(event) => setAddressEditDrafts((current) => ({ ...current, [address.id]: { ...(current[address.id] ?? emptyAddressDraft), postalCode: event.target.value } }))} required />
                        </label>
                        <button className="button button-primary" type="submit">{props.copy.actions.save}</button>
                        <button className="button button-secondary" type="button" onClick={() => setEditingAddressId(null)}>{props.copy.actions.cancel}</button>
                      </form>
                    ) : (
                      <div className="dashboard-row-actions">
                        {props.canEdit === true ? (
                          <>
                            <button className="button button-secondary" type="button" onClick={() => beginAddressEdit(address)}>{props.copy.actions.edit}</button>
                            {!address.isDefault ? <button className="button button-secondary" type="button" onClick={() => setDefaultAddress(address)}>{props.copy.users.setDefault}</button> : null}
                            <button className="button button-secondary" type="button" onClick={() => deleteAddress(address)}>{props.copy.actions.delete}</button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {props.canEdit === true ? (
              <form
                className="dashboard-card dashboard-quick-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  createAddress();
                }}
              >
                <h4>{props.copy.users.addAddress}</h4>
                <label className="field">
                  <span>{props.copy.users.label}</span>
                  <input value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{props.copy.common.firstName}</span>
                  <input value={addressDraft.firstName} onChange={(event) => setAddressDraft((current) => ({ ...current, firstName: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>{props.copy.common.lastName}</span>
                  <input value={addressDraft.lastName} onChange={(event) => setAddressDraft((current) => ({ ...current, lastName: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>{props.copy.common.phone}</span>
                  <input value={addressDraft.phone} onChange={(event) => setAddressDraft((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{props.copy.users.addressLine1}</span>
                  <input value={addressDraft.addressLine1} onChange={(event) => setAddressDraft((current) => ({ ...current, addressLine1: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>{props.copy.users.addressLine2}</span>
                  <input value={addressDraft.addressLine2} onChange={(event) => setAddressDraft((current) => ({ ...current, addressLine2: event.target.value }))} />
                </label>
                <label className="field">
                  <span>{props.copy.users.city}</span>
                  <input value={addressDraft.city} onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>{props.copy.users.province}</span>
                  <select value={addressDraft.province} onChange={(event) => setAddressDraft((current) => ({ ...current, province: event.target.value }))} required>
                    <option value="">{props.copy.common.select}</option>
                    {CANADIAN_PROVINCE_OPTIONS.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{props.copy.users.postalCode}</span>
                  <input value={addressDraft.postalCode} onChange={(event) => setAddressDraft((current) => ({ ...current, postalCode: event.target.value }))} required />
                </label>
                <button className="button button-primary" type="submit">{props.copy.users.addAddress}</button>
              </form>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function RolesPanel(props: {
  readOnly?: boolean;
  copy: DashboardCopy;
  input: { key: string; name: string };
  onChange: (value: { key: string; name: string }) => void;
  onSubmit: () => void;
  roles: Role[];
}) {
  return (
    <>
      <PanelHeader title={props.copy.roles.title} copy={props.copy.roles.copy} />
      {!props.readOnly ? <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: props.input.name,
            onChange: (name) => props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
          },
          {
            label: "角色标识",
            value: props.input.key,
            onChange: (key) => props.onChange({ ...props.input, key }),
            hint: "系统权限标识（英文，如 support），默认按名称自动生成；创建后用于权限匹配"
          }
        ]}
        onSubmit={props.onSubmit}
        title={props.copy.roles.create}
      /> : null}
      <Table
        caption={props.copy.roles.title}
        emptyMessage={`${props.copy.roles.title}: ${props.copy.common.noRecords}`}
        columns={[props.copy.common.name, "角色标识", props.copy.roles.permissions]}
        rows={props.roles.map((role) => [
          role.name,
          role.key,
          role.rolePermissions?.map((permission) => permission.permission.key).join(", ") || "-"
        ])}
      />
    </>
  );
}

export function DealersPanel(props: { copy: DashboardCopy; dealers: Dealer[]; readOnly?: boolean; canEdit?: boolean; locale?: SiteLocale; apiFetch?: (path: string, init?: RequestInit) => Promise<unknown>; onAction?: ActionHandler; onReload?: () => Promise<void> }) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Dealer | null>(null);
  const [dealerEditing, setDealerEditing] = useState(false);
  const [dealerNameDraft, setDealerNameDraft] = useState("");
  const [dealerStatusDraft, setDealerStatusDraft] = useState("active");
  const [actionError, setActionError] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<Record<string, string | boolean>>({ code: "", name: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "", country: "CA", pickupAvailable: false, deliveryAvailable: false });
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationEditDrafts, setLocationEditDrafts] = useState<Record<string, Record<string, string | boolean>>>({});
  const [erpLinkDraft, setErpLinkDraft] = useState({ erpSystem: "vanstro-erp", erpLocationId: "", dealerLocationId: "" });
  const [addingErpLink, setAddingErpLink] = useState(false);
  const [dealerDraft, setDealerDraft] = useState<Record<string, string>>({ name: "", code: "", phone: "", email: "", website: "", status: "active" });
  const [dealerCodeTouched, setDealerCodeTouched] = useState(false);
  const [serviceAreaDraft, setServiceAreaDraft] = useState<Record<string, string>>({ areaType: "fsa", areaCode: "" });
  const [dependencies, setDependencies] = useState<DealerDependencies | null>(null);
  const [dependenciesError, setDependenciesError] = useState<string | null>(null);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  function existingDealerCodes() {
    return new Set(props.dealers.map((dealer) => dealer.code));
  }
  function suggestDealerCode(name: string) {
    const codes = existingDealerCodes();
    const base = (name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "DEALER");
    let candidate = base;
    let suffix = 1;
    while (codes.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
  function openCreateDealerForm() {
    setDealerDraft({ name: "", code: "", phone: "", email: "", website: "", status: "active" });
    setDealerCodeTouched(false);
    setActionError(null);
  }
  function updateDealerDraft(key: string, value: string) {
    setDealerDraft((current) => ({ ...current, [key]: value }));
    if (key === "name" && !dealerCodeTouched) {
      setDealerDraft((current) => ({ ...current, code: suggestDealerCode(value) }));
    }
    if (key === "code") setDealerCodeTouched(Boolean(value.trim()));
  }
  function createDealer() {
    const body: Record<string, unknown> = {
      code: dealerDraft.code.trim(),
      name: dealerDraft.name.trim(),
      status: dealerDraft.status,
      ...(dealerDraft.phone.trim() ? { phone: dealerDraft.phone.trim() } : {}),
      ...(dealerDraft.email.trim() ? { email: dealerDraft.email.trim() } : {}),
      ...(dealerDraft.website.trim() ? { website: dealerDraft.website.trim() } : {})
    };
    const action = props.onAction?.("/dashboard/dealers", body, { method: "POST", success: props.copy.messages.adminUserCreated });
    if (!action) return;
    void Promise.resolve(action)
      .then((payload) => {
        setActionError(null);
        openCreateDealerForm();
        void props.onReload?.();
        const created = (payload as { data?: { id?: string } } | undefined)?.data;
        if (created?.id) void openDealer(created.id);
      })
      .catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "创建失败，请重试。");
      });
  }
  async function previewDependencies() {
    if (!detail || !props.apiFetch) return;
    setDependencies(null);
    setDependenciesError(null);
    setConfirmArchiveOpen(false);
    try {
      const payload = await props.apiFetch(`/dashboard/dealers/${detail.id}/dependencies`) as { data: DealerDependencies };
      setDependencies(payload.data);
    } catch {
      setDependenciesError("无法读取依赖汇总，请稍后重试。");
    }
  }
  function archiveDealer() {
    if (!detail) return;
    submitDealerAction(`/dashboard/dealers/${detail.id}`, { status: "inactive" }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
    setConfirmArchiveOpen(false);
  }
  function restoreDealer() {
    if (!detail) return;
    submitDealerAction(`/dashboard/dealers/${detail.id}`, { status: "active" }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
  }
  function deleteDealer() {
    if (!detail) return;
    if (!window.confirm("确认物理删除该经销商？此操作不可恢复，仅允许在没有任何依赖引用时执行。")) return;
    submitDealerAction(`/dashboard/dealers/${detail.id}`, {}, { method: "DELETE", success: props.copy.messages.adminUserCreated });
    closeDealer();
  }
  function dependencyLine(label: string, count: number) {
    return <li><span>{label}</span><strong>{count}</strong></li>;
  }
  async function openDealer(id: string) {
    setDrawerId(id);
    setDetail(null);
    setActionError(null);
    if (!props.apiFetch) return;
    try {
      const payload = (await props.apiFetch(`/dashboard/dealers/${id}`)) as { data: Dealer };
      const dealer = payload.data;
      setDetail(dealer);
      setDealerEditing(false);
      setDealerNameDraft(dealer.name);
      setDealerStatusDraft(dealer.status);
    } catch {
      setDetail(null);
    }
  }
  function closeDealer() {
    setDrawerId(null);
    setDetail(null);
    setEditingLocationId(null);
    setAddingErpLink(false);
    setActionError(null);
  }
  function submitDealerAction(path: string, body: Record<string, unknown>, options: { method?: string; success: string }) {
    const action = props.onAction?.(path, body, options);
    if (!action) return;
    void Promise.resolve(action)
      .then(() => {
        setActionError(null);
        if (detail) void openDealer(detail.id);
        void props.onReload?.();
      })
      .catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "操作失败，请重试。");
      });
  }
  function beginLocationEdit(location: { id: string; code: string; name: string; addressLine1?: string | null; addressLine2?: string | null; city?: string | null; province?: string | null; postalCode?: string | null; country?: string | null; latitude?: number | null; longitude?: number | null; pickupAvailable?: boolean; deliveryAvailable?: boolean }) {
    setEditingLocationId(location.id);
    setLocationEditDrafts((current) => ({ ...current, [location.id]: {
      code: location.code, name: location.name, addressLine1: location.addressLine1 ?? "", addressLine2: location.addressLine2 ?? "", city: location.city ?? "", province: location.province ?? "", postalCode: location.postalCode ?? "", country: location.country ?? "CA", latitude: location.latitude === null || location.latitude === undefined ? "" : String(location.latitude), longitude: location.longitude === null || location.longitude === undefined ? "" : String(location.longitude), pickupAvailable: location.pickupAvailable ?? false, deliveryAvailable: location.deliveryAvailable ?? false
    } }));
  }
  function archiveLocation(location: { id: string; name: string }) {
    if (!window.confirm(`停用网点「${location.name}」后将从默认列表隐藏，可随时恢复。确认停用？`)) return;
    submitDealerAction(`/dashboard/dealer-locations/${location.id}`, { status: "inactive" }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
  }
  function restoreLocation(location: { id: string }) {
    submitDealerAction(`/dashboard/dealer-locations/${location.id}`, { status: "active" }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
  }
  function saveLocationEdit(locationId: string) {
    const draft = locationEditDrafts[locationId];
    if (!draft) return;
    const body: Record<string, unknown> = {
      code: draft.code, name: draft.name, addressLine1: draft.addressLine1, addressLine2: draft.addressLine2, city: draft.city, province: draft.province, postalCode: draft.postalCode, country: draft.country, pickupAvailable: Boolean(draft.pickupAvailable), deliveryAvailable: Boolean(draft.deliveryAvailable)
    };
    if (String(draft.latitude ?? "").trim() || String(draft.longitude ?? "").trim()) {
      body.latitude = Number(String(draft.latitude ?? "").trim());
      body.longitude = Number(String(draft.longitude ?? "").trim());
    }
    submitDealerAction(`/dashboard/dealer-locations/${locationId}`, body, { method: "PATCH", success: props.copy.messages.adminUserCreated });
    setEditingLocationId(null);
  }
  function createLocation() {
    if (!detail) return;
    const body: Record<string, unknown> = {
      code: locationDraft.code, name: locationDraft.name, addressLine1: locationDraft.addressLine1, addressLine2: locationDraft.addressLine2, city: locationDraft.city, province: locationDraft.province, postalCode: locationDraft.postalCode, country: locationDraft.country, pickupAvailable: Boolean(locationDraft.pickupAvailable), deliveryAvailable: Boolean(locationDraft.deliveryAvailable)
    };
    if (String(locationDraft.latitude ?? "").trim() || String(locationDraft.longitude ?? "").trim()) {
      body.latitude = Number(String(locationDraft.latitude ?? "").trim());
      body.longitude = Number(String(locationDraft.longitude ?? "").trim());
    }
    const areaCode = String(serviceAreaDraft.areaCode ?? "").trim();
    const action = props.onAction?.(`/dashboard/dealers/${detail.id}/locations`, body, { method: "POST", success: props.copy.messages.adminUserCreated });
    if (!action) return;
    void Promise.resolve(action)
      .then((payload) => {
        const created = (payload as { data?: { id?: string } } | undefined)?.data;
        const chain = created?.id && areaCode
          ? Promise.resolve(props.onAction?.(`/dashboard/dealer-locations/${created.id}/service-areas`, { areaType: serviceAreaDraft.areaType, areaCode }, { method: "POST", success: props.copy.messages.adminUserCreated }))
          : undefined;
        return chain ?? Promise.resolve(undefined);
      })
      .then(() => {
        setActionError(null);
        setLocationDraft({ code: "", name: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "", country: "CA", pickupAvailable: false, deliveryAvailable: false });
        setServiceAreaDraft({ areaType: "fsa", areaCode: "" });
        if (detail) void openDealer(detail.id);
        void props.onReload?.();
      })
      .catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "操作失败，请重试。");
      });
  }
  function addErpLink() {
    if (!detail) return;
    const body: Record<string, unknown> = { erpSystem: erpLinkDraft.erpSystem, erpLocationId: erpLinkDraft.erpLocationId };
    if (erpLinkDraft.dealerLocationId) body.dealerLocationId = erpLinkDraft.dealerLocationId;
    submitDealerAction(`/dashboard/dealers/${detail.id}/erp-links`, body, { method: "POST", success: props.copy.messages.adminUserCreated });
    setErpLinkDraft({ erpSystem: "vanstro-erp", erpLocationId: "", dealerLocationId: "" });
    setAddingErpLink(false);
  }
  function unlinkErpLink(link: { id: string; erpSystem: string; erpLocationId: string }) {
    if (!detail) return;
    if (!window.confirm(`确认解除与 ${link.erpSystem} 的关联 ${link.erpLocationId}？解除后同步将不再使用该映射。`)) return;
    submitDealerAction(`/dashboard/dealers/${detail.id}/erp-links/${link.id}`, {}, { method: "DELETE", success: props.copy.messages.adminUserCreated });
  }
  return (
    <>
      <PanelHeader title={props.copy.dealers.title} copy={props.copy.dealers.copy} />
      {props.canEdit ? (
        <form
          className="dashboard-inline-form"
          onSubmit={(event) => { event.preventDefault(); createDealer(); }}
        >
          <h5>新增经销商</h5>
          <label className="field">
            <span>{props.copy.common.name}</span>
            <input required value={dealerDraft.name} onChange={(event) => updateDealerDraft("name", event.target.value)} />
          </label>
          <label className="field">
            <span>{props.copy.dealers.code}</span>
            <input required value={dealerDraft.code} onChange={(event) => updateDealerDraft("code", event.target.value)} />
            <small>唯一经销商编号；可根据名称自动建议，也可手动修改。</small>
          </label>
          <div className="dashboard-row-actions">
            <button className="button button-secondary" type="button" onClick={() => setDealerDraft((current) => ({ ...current, code: suggestDealerCode(current.name) }))}>自动建议编号</button>
          </div>
          <label className="field"><span>电话</span><input value={dealerDraft.phone} onChange={(event) => updateDealerDraft("phone", event.target.value)} /></label>
          <label className="field"><span>邮箱</span><input type="email" value={dealerDraft.email} onChange={(event) => updateDealerDraft("email", event.target.value)} /></label>
          <label className="field"><span>网站</span><input type="url" value={dealerDraft.website} onChange={(event) => updateDealerDraft("website", event.target.value)} /></label>
          <label className="field">
            <span>{props.copy.common.status}</span>
            <select value={dealerDraft.status} onChange={(event) => setDealerDraft((current) => ({ ...current, status: event.target.value }))}>
              {["active", "inactive"].map((status) => (
                <option key={status} value={status}>{displayDashboardValue(props.copy, status)}</option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">创建经销商</button>
          <button className="button button-secondary" type="button" onClick={openCreateDealerForm}>清除</button>
        </form>
      ) : null}
      {actionError ? <p className="dashboard-form-error" role="alert">{actionError}</p> : null}
      <Table
        caption={props.copy.dealers.title}
        emptyMessage={`${props.copy.dealers.title}: ${props.copy.common.noRecords}`}
        columns={[props.copy.common.name, props.copy.dealers.code, props.copy.common.status, props.copy.dealers.locations, props.copy.common.details]}
        rows={props.dealers.map((dealer) => [
          dealer.name,
          dealer.code,
          displayDashboardValue(props.copy, dealer.status),
          dealer.locations
            ?.map((location) => [location.name, location.city, location.province].filter(Boolean).join(", "))
            .join(" / ") || "-",
          props.apiFetch ? (
            <>
              <button onClick={() => openDealer(dealer.id)} type="button">查看详情</button>
              {props.canEdit ? <button onClick={() => { void openDealer(dealer.id).then(() => setDealerEditing(true)); }} type="button">编辑</button> : null}
            </>
          ) : "-"
        ])}
      />
      <DetailDrawer open={Boolean(drawerId && detail)} title={detail?.name ?? ""} onClose={closeDealer}>
        <dl className="dealer-detail">
          <div><dt>经销商编号</dt><dd>{detail?.code ?? "-"}</dd></div>
          <div><dt>状态</dt><dd>{detail ? displayDashboardValue(props.copy, detail.status) : "-"}</dd></div>
        </dl>
        {actionError ? <p className="dashboard-form-error" role="alert">{actionError}</p> : null}

        {props.canEdit && dealerEditing && detail ? (
          <form
            className="dashboard-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const nextStatus = dealerStatusDraft;
              if (nextStatus === "inactive" && !window.confirm("停用后将从默认列表隐藏，可随时恢复。确认停用？")) return;
              submitDealerAction(`/dashboard/dealers/${detail.id}`, { name: dealerNameDraft, status: nextStatus }, { method: "PATCH", success: props.copy.messages.adminUserCreated });
              setDealerEditing(false);
            }}
          >
            <label className="field">
              <span>{props.copy.common.name}</span>
              <input value={dealerNameDraft} onChange={(event) => setDealerNameDraft(event.target.value)} required />
            </label>
            <label className="field">
              <span>{props.copy.common.status}</span>
              <select value={dealerStatusDraft} onChange={(event) => setDealerStatusDraft(event.target.value)}>
                {["active", "inactive"].map((status) => (
                  <option key={status} value={status}>{displayDashboardValue(props.copy, status)}</option>
                ))}
              </select>
            </label>
            <button className="button button-primary" type="submit">{props.copy.actions.save}</button>
            <button className="button button-secondary" type="button" onClick={() => setDealerEditing(false)}>取消</button>
          </form>
        ) : null}

        {props.canEdit && detail ? (
          <div className="dashboard-row-actions">
            {detail?.status === "active" ? (
              <button className="button button-secondary" type="button" onClick={() => { void previewDependencies(); }}>停用经销商</button>
            ) : (
              <button className="button button-secondary" type="button" onClick={restoreDealer}>恢复经销商</button>
            )}
            <button className="button button-secondary" type="button" disabled={!(dependencies?.physicallyDeletable === true && detail.status !== "active")} onClick={deleteDealer}>删除经销商</button>
          </div>
        ) : null}
        {dependencies ? (
          <section className="dealer-dependencies" aria-label="删除前依赖检查">
            <h5>删除前依赖检查</h5>
            <p>以下引用存在时只能停用（归档），不能物理删除；停用后将从公开 API、产品页与地图消失，历史订单仍可解析。</p>
            <ul>
              {dependencyLine("网点", dependencies.references.locations.total)}
              {dependencyLine("库存快照", dependencies.references.inventorySnapshots)}
              {dependencyLine("库存预留", dependencies.references.inventoryReservations)}
              {dependencyLine("订单", dependencies.references.orders)}
              {dependencyLine("支付会话", dependencies.references.paymentSessions)}
              {dependencyLine("支持交接", dependencies.references.supportHandoffs)}
              {dependencyLine("用户成员", dependencies.references.memberships)}
              {dependencyLine("ERP 关联", dependencies.references.erpLinks)}
              {dependencyLine("服务区域", dependencies.references.serviceAreas)}
            </ul>
            {dependencies.physicallyDeletable ? (
              <p>当前无任何引用，可以物理删除（不可恢复）或停用。</p>
            ) : (
              <p>存在引用，仅可停用（归档）。</p>
            )}
            {detail?.status === "active" ? (
              <div className="dashboard-row-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    if (window.confirm("确认停用该经销商？停用后将从公开 API、产品页、地图与新建订单选择中消失，可随时恢复。")) archiveDealer();
                  }}
                >
                  确认停用
                </button>
                <button className="button button-secondary" type="button" onClick={() => setDependencies(null)}>取消</button>
              </div>
            ) : (
              <p>该经销商已停用；可随时恢复。</p>
            )}
          </section>
        ) : null}
        {dependenciesError ? <p className="dashboard-form-error" role="alert">{dependenciesError}</p> : null}

        <h4>{props.copy.dealers.locations}</h4>
        {!detail?.locations?.length ? <p>{props.copy.common.noRecords}</p> : (
          <ul className="dashboard-notes-list">
            {detail.locations.map((location) => (
              <li key={location.id}>
                <strong>{location.name}</strong>
                <small>{[location.code, location.city, location.province, location.postalCode].filter(Boolean).join(" · ")}</small>
                <small>状态：{displayDashboardValue(props.copy, location.status)}</small>
                {location.addressLine1 ? <small>{location.addressLine1}</small> : null}
                {props.canEdit ? (
                  <>
                    <div className="dashboard-row-actions">
                      <button className="button button-secondary" type="button" onClick={() => beginLocationEdit(location)}>编辑</button>
                      {location.status === "active" ? (
                        <button className="button button-secondary" type="button" onClick={() => archiveLocation(location)}>停用</button>
                      ) : (
                        <button className="button button-secondary" type="button" onClick={() => restoreLocation(location)}>恢复</button>
                      )}
                    </div>
                    {editingLocationId === location.id ? (
                      <form
                        className="dashboard-inline-form"
                        onSubmit={(event) => { event.preventDefault(); saveLocationEdit(location.id); }}
                      >
                        <label className="field"><span>{props.copy.common.name}</span><input required value={String(locationEditDrafts[location.id]?.name ?? location.name)} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), name: event.target.value } }))} /></label>
                        <label className="field"><span>网点编号</span><input required value={String(locationEditDrafts[location.id]?.code ?? location.code)} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), code: event.target.value } }))} /><small className="field-help">同一经销商内唯一；用于库存与订单归属</small></label>
                        <label className="field"><span>地址</span><input value={String(locationEditDrafts[location.id]?.addressLine1 ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), addressLine1: event.target.value } }))} /></label>
                        <label className="field"><span>城市</span><input value={String(locationEditDrafts[location.id]?.city ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), city: event.target.value } }))} /></label>
                        <label className="field"><span>省/州</span><input value={String(locationEditDrafts[location.id]?.province ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), province: event.target.value } }))} /></label>
                        <label className="field"><span>邮编</span><input value={String(locationEditDrafts[location.id]?.postalCode ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), postalCode: event.target.value } }))} /></label>
                        <label className="field"><span>国家</span><input value={String(locationEditDrafts[location.id]?.country ?? "CA")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), country: event.target.value } }))} /></label>
                        <label className="field"><span>纬度</span><input inputMode="decimal" placeholder="例如 49.8951" value={String(locationEditDrafts[location.id]?.latitude ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), latitude: event.target.value } }))} /></label>
                        <label className="field"><span>经度</span><input inputMode="decimal" placeholder="例如 -97.1384" value={String(locationEditDrafts[location.id]?.longitude ?? "")} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), longitude: event.target.value } }))} /></label>
                        <label className="field"><span>自提可用</span><input type="checkbox" checked={Boolean(locationEditDrafts[location.id]?.pickupAvailable)} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), pickupAvailable: event.target.checked } }))} /></label>
                        <label className="field"><span>配送可用</span><input type="checkbox" checked={Boolean(locationEditDrafts[location.id]?.deliveryAvailable)} onChange={(event) => setLocationEditDrafts((current) => ({ ...current, [location.id]: { ...(current[location.id] ?? {}), deliveryAvailable: event.target.checked } }))} /></label>
                        <button className="button button-primary" type="submit">{props.copy.actions.save}</button>
                        <button className="button button-secondary" type="button" onClick={() => setEditingLocationId(null)}>取消</button>
                      </form>
                    ) : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {props.canEdit ? (
          <form
            className="dashboard-inline-form"
            onSubmit={(event) => { event.preventDefault(); createLocation(); }}
          >
            <h5>新增网点</h5>
            <label className="field"><span>{props.copy.common.name}</span><input required value={String(locationDraft.name ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="field"><span>网点编号</span><input required value={String(locationDraft.code ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, code: event.target.value }))} /><small className="field-help">同一经销商内唯一；用于库存与订单归属</small></label>
            <label className="field"><span>地址</span><input value={String(locationDraft.addressLine1 ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, addressLine1: event.target.value }))} /></label>
            <label className="field"><span>城市</span><input value={String(locationDraft.city ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, city: event.target.value }))} /></label>
            <label className="field"><span>省/州</span><input value={String(locationDraft.province ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, province: event.target.value }))} /></label>
            <label className="field"><span>邮编</span><input value={String(locationDraft.postalCode ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, postalCode: event.target.value }))} /></label>
            <label className="field"><span>国家</span><input value={String(locationDraft.country ?? "CA")} onChange={(event) => setLocationDraft((current) => ({ ...current, country: event.target.value }))} /></label>
            <label className="field"><span>纬度</span><input inputMode="decimal" placeholder="例如 49.8951" value={String(locationDraft.latitude ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, latitude: event.target.value }))} /></label>
            <label className="field"><span>经度</span><input inputMode="decimal" placeholder="例如 -97.1384" value={String(locationDraft.longitude ?? "")} onChange={(event) => setLocationDraft((current) => ({ ...current, longitude: event.target.value }))} /></label>
            <label className="field"><span>服务区域类型</span><select value={serviceAreaDraft.areaType} onChange={(event) => setServiceAreaDraft((current) => ({ ...current, areaType: event.target.value }))}><option value="fsa">FSA（邮编前三位）</option><option value="postal_prefix">邮编前缀</option></select></label>
            <label className="field"><span>服务区域代码</span><input placeholder="例如 R3C" value={serviceAreaDraft.areaCode} onChange={(event) => setServiceAreaDraft((current) => ({ ...current, areaCode: event.target.value.toUpperCase() }))} /></label>
            <label className="field"><span>自提可用</span><input type="checkbox" checked={Boolean(locationDraft.pickupAvailable)} onChange={(event) => setLocationDraft((current) => ({ ...current, pickupAvailable: event.target.checked }))} /></label>
            <label className="field"><span>配送可用</span><input type="checkbox" checked={Boolean(locationDraft.deliveryAvailable)} onChange={(event) => setLocationDraft((current) => ({ ...current, deliveryAvailable: event.target.checked }))} /></label>
            <button className="button button-primary" type="submit">新增网点</button>
            <button className="button button-secondary" type="button" onClick={() => { setLocationDraft({ code: "", name: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "", country: "CA", pickupAvailable: false, deliveryAvailable: false }); setServiceAreaDraft({ areaType: "fsa", areaCode: "" }); }}>清除</button>
          </form>
        ) : null}

        <h4>ERP 关联</h4>
        {!detail?.erpLinks?.length ? <p>{props.copy.common.noRecords}</p> : (
          <ul className="dashboard-notes-list">
            {detail.erpLinks.map((link) => (
              <li key={link.id}>
                <strong>{link.erpSystem}</strong>
                <small>ERP 网点编号：{link.erpLocationId}</small>
                {link.dealerLocation ? <small>网点：{link.dealerLocation.name}</small> : null}
                <small>创建于 {formatDate(link.createdAt, props.locale ?? "zh-CN")}</small>
                {props.canEdit ? (
                  <div className="dashboard-row-actions">
                    <button className="button button-secondary" type="button" onClick={() => unlinkErpLink(link)}>解除关联</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {props.canEdit ? (
          addingErpLink ? (
            <form
              className="dashboard-inline-form"
              onSubmit={(event) => { event.preventDefault(); addErpLink(); }}
            >
              <h5>新增 ERP 关联</h5>
              <label className="field"><span>ERP 系统</span><input required value={erpLinkDraft.erpSystem} onChange={(event) => setErpLinkDraft((current) => ({ ...current, erpSystem: event.target.value }))} /></label>
              <label className="field"><span>ERP 网点编号</span><input required value={erpLinkDraft.erpLocationId} onChange={(event) => setErpLinkDraft((current) => ({ ...current, erpLocationId: event.target.value }))} /><small className="field-help">该 ERP 系统中此网点的编号/ID（如 EXT-1），用于库存与订单同步</small></label>
              <label className="field"><span>网点（可选）</span><select value={erpLinkDraft.dealerLocationId} onChange={(event) => setErpLinkDraft((current) => ({ ...current, dealerLocationId: event.target.value }))}><option value="">未指定</option>{detail?.locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <button className="button button-primary" type="submit">保存关联</button>
              <button className="button button-secondary" type="button" onClick={() => { setAddingErpLink(false); setErpLinkDraft({ erpSystem: "vanstro-erp", erpLocationId: "", dealerLocationId: "" }); }}>取消</button>
            </form>
          ) : (
            <button className="button button-secondary" type="button" onClick={() => setAddingErpLink(true)}>新增 ERP 关联</button>
          )
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function CrmContactsPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  copy: DashboardCopy;
  locale: string;
  contacts: CrmContactRecord[];
  meta: PageMeta;
  statusFilter: string;
  page: number;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
  canUpdate: boolean;
  canPromote: boolean;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmContactDetail | null>(null);
  const [contactEditing, setContactEditing] = useState(false);
  const [stageDraft, setStageDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function openContact(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<CrmContactDetail>>(`/dashboard/crm/contacts/${id}`);
    setDetail(payload.data);
    setContactEditing(false);
    setStageDraft(payload.data.stage);
    setNoteDraft("");
    setDrawerId(id);
  }

  function closeDrawer() {
    setDrawerId(null);
    setDetail(null);
  }

  const stageOptions = [
    { value: "", label: props.copy.handoffs.filterAll },
    { value: "registered", label: props.copy.statusValues.crm.registered },
    { value: "engaged", label: props.copy.statusValues.crm.engaged },
    { value: "checkout_started", label: props.copy.statusValues.crm.checkout_started },
    { value: "customer", label: props.copy.statusValues.crm.customer },
    { value: "high_intent", label: props.copy.statusValues.crm.high_intent },
    { value: "archived", label: props.copy.statusValues.crm.archived }
  ];

  return (
    <>
      <PanelHeader title={props.copy.crm.title} copy={props.copy.crm.copy} />
      <QueueStatusFilter
        label={props.copy.crm.stage}
        value={props.statusFilter}
        onChange={props.onFilterChange}
        options={stageOptions}
      />
      <PaginationBar
        page={props.page}
        totalPages={props.meta.totalPages}
        total={props.meta.total}
        pageLabel={pageLabel(props.copy, props.meta)}
        onPageChange={props.onPageChange}
      />
      <Table
        caption={props.copy.crm.title}
        emptyMessage={`${props.copy.crm.title}: ${props.copy.common.noRecords}`}
        columns={[
          `${props.copy.common.name} / ${props.copy.common.email}`,
          props.copy.crm.stage,
          props.copy.crm.source,
          props.copy.crm.erpSync,
          props.copy.common.created,
          props.copy.common.details
        ]}
        rows={props.contacts.map((contact) => [
          <span key="contact">
            <strong>{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || "受限客户资料"}</strong>
            <small>{contact.email ?? "个人资料不可见"}</small>
          </span>,
          displayDashboardStatus(props.copy, "crm", contact.stage),
          contact.source,
          displayDashboardStatus(props.copy, "crm", contact.erpSyncStatus),
          formatDate(contact.lastActivityAt, props.locale),
          <QueueActionCell
            key="actions"
            actions={[
              { label: props.copy.actions.view, onClick: () => void openContact(contact.id) },
              ...(props.canEdit ? [{ label: "编辑", onClick: () => { void openContact(contact.id).then(() => setContactEditing(true)); } }] : [])
            ]}
          />
        ])}
      />
      <DetailDrawer open={Boolean(drawerId)} title={detail?.email ?? "受限客户资料"} onClose={closeDrawer}>
        {detail ? (
          <>
            <p>
              <strong>{[detail.firstName, detail.lastName].filter(Boolean).join(" ") || detail.email || "受限客户资料"}</strong>
            </p>
            <p>{detail.phone ?? "-"}</p>
            <p>
              {props.copy.crm.stage}: {displayDashboardStatus(props.copy, "crm", detail.stage)}
            </p>
            <p>
              {props.copy.crm.erpSync}: {displayDashboardStatus(props.copy, "crm", detail.erpSyncStatus)}
            </p>
            {detail.owner ? <p>Owner: {detail.owner.displayLabel ?? "已分配"}</p> : null}
            {props.canUpdate && !props.readOnly ? (
              <form
                className="dashboard-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void props
                    .onAction(`/dashboard/crm/contacts/${detail.id}`, { stage: stageDraft }, { method: "PATCH", success: props.copy.messages.crmUpdated })
                    .then(() => openContact(detail.id));
                }}
              >
                <select value={stageDraft} onChange={(event) => setStageDraft(event.target.value)}>
                  {stageOptions.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="button button-secondary" type="submit">
                  {props.copy.actions.updateStatus}
                </button>
              </form>
            ) : null}
            {props.canPromote && !props.readOnly ? (
              <button
                className="button button-primary"
                disabled={!detail.promotionEligible}
                title={detail.promotionEligible ? undefined : props.copy.crm.noUser}
                type="button"
                onClick={() =>
                  void props
                    .onAction(`/dashboard/crm/contacts/${detail.id}/promote-to-erp`, {}, { success: props.copy.messages.crmPromoted })
                    .then(() => openContact(detail.id))
                }
              >
                {props.copy.crm.promote}
              </button>
            ) : null}
            {detail.tasks.length ? (
              <>
                <h4>Follow-up tasks</h4>
                <ul className="dashboard-notes-list">
                  {detail.tasks.map((task) => (
                    <li key={task.id}>
                      <strong>跟进任务</strong> — {task.status}{task.dueAt ? ` — due ${formatDate(task.dueAt, props.locale)}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h4>{props.copy.crm.events}</h4>
            <ul className="dashboard-notes-list">
              {detail.events.map((event) => (
                <li key={event.id}>
                  <strong>{event.type}</strong>
                  <small>{formatDate(event.createdAt, props.locale)}</small>
                </li>
              ))}
            </ul>
            {detail.notes.length ? <p>已记录 {detail.notes.length} 条受限备注。</p> : null}
            {props.canUpdate && !props.readOnly ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void props
                    .onAction(`/dashboard/crm/contacts/${detail.id}/notes`, { note: noteDraft }, { success: props.copy.messages.crmNoteAdded })
                    .then(() => openContact(detail.id));
                }}
              >
                <label>
                  {props.copy.common.note}
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} />
                </label>
                <button className="button button-secondary" type="submit">
                  {props.copy.actions.addNote}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      
        {props.canEdit && contactEditing && detail ? (
          <form
            className="dashboard-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void props
                .onAction(`/dashboard/crm/contacts/${detail.id}`, { stage: stageDraft }, { method: "PATCH", success: props.copy.messages.adminUserCreated })
                .then(() => props.onReload());
            }}
          >
            <label className="field">
              <span>{props.copy.crm.stage}</span>
              <select value={stageDraft} onChange={(event) => setStageDraft(event.target.value)}>
                {["registered", "engaged", "checkout_started", "customer", "high_intent", "archived"].map((stage) => (
                  <option key={stage} value={stage}>{displayDashboardValue(props.copy, stage)}</option>
                ))}
              </select>
            </label>
            <button className="button button-primary" type="submit">{props.copy.actions.save}</button>
          </form>
        ) : null}
      </DetailDrawer>
    </>
  );
}
