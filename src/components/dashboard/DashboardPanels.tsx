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
  fields: Array<{ label: string; value: string; onChange: (value: string) => void; type?: string }>;
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
            <form
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
            </form>
            <form
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
            </form>
            <form
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
            </form>
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function DealerApplicationsPanel(props: {
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
            <form
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
            </form>
            <form
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
            </form>
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function ProductReviewsPanel(props: {
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
            <form
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
            </form>
            <form
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
            </form>
            <NotesList notes={detail.notes} locale={props.locale} />
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function SupportHandoffsPanel(props: {
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
        ])}
      />
    </>
  );
}

export function ProductsPanel(props: {
  copy: DashboardCopy;
  locale: string;
  products: Product[];
  categories: Category[];
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
}) {
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

  async function openProduct(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<Product>>(`/dashboard/products/${id}`);
    setDetail(payload.data);
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
      <div className="dashboard-row-actions" style={{ marginBottom: 16 }}>
        <button
          className="button button-secondary"
          type="button"
          onClick={() =>
            void props.onAction(
              "/dashboard/catalog/sync-from-erp",
              { syncCategories: true },
              { method: "POST", success: props.copy.messages.catalogSynced }
            ).then(() => props.onReload())
          }
        >
          {props.copy.products.syncFromErp}
        </button>
      </div>
      <div className="dashboard-form-grid">
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
              onChange: (slug) => setProductInput({ ...productInput, slug })
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
      </div>
      <Table
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
            actions={[{ label: props.copy.actions.view, onClick: () => void openProduct(product.id) }]}
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
          <>
            <form
              className="dashboard-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
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
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function CategoriesPanel(props: {
  copy: DashboardCopy;
  categories: Category[];
  onAction: ActionHandler;
  onReload: () => Promise<void>;
}) {
  const [input, setInput] = useState({ name: "", slug: "" });
  const [drafts, setDrafts] = useState<Record<string, { slug: string; isActive: boolean }>>({});

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
      <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: input.name,
            onChange: (name) => setInput({ ...input, name, slug: input.slug || slugify(name) })
          },
          {
            label: props.copy.common.slug,
            value: input.slug,
            onChange: (slug) => setInput({ ...input, slug })
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
      />
      <Table
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
            <form
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
            "-"
          ];
        })}
      />
    </>
  );
}

export function PricingPanel(props: {
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
      <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          void props
            .onAction(
              "/dashboard/pricing",
              {
                skuId: input.skuId,
                amountCents: Number(input.amountCents),
                key: input.key,
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
          <span>{props.copy.common.key}</span>
          <input value={input.key} onChange={(event) => setInput({ ...input, key: event.target.value })} required />
        </label>
        <button className="button button-primary" type="submit">
          {props.copy.pricing.create}
        </button>
      </form>
      <Table
        columns={[
          props.copy.common.key,
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
            <form
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
      <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: input.name,
            onChange: (name) => setInput({ ...input, name, key: input.key || slugify(name) })
          },
          {
            label: props.copy.common.key,
            value: input.key,
            onChange: (key) => setInput({ ...input, key })
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
      />
      <Table
        columns={[
          props.copy.common.name,
          props.copy.common.key,
          props.copy.common.status,
          props.copy.promotions.label,
          props.copy.common.details
        ]}
        rows={props.promotions.map((promotion) => [
          promotion.name,
          promotion.key,
          <form
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
              {["draft", "active", "inactive", "archived"].map((status) => (
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
          </form>,
          promotion.discountLabel ?? "-"
        ])}
      />
    </>
  );
}

export function OrdersPanel(props: {
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
          { value: "paid", label: displayDashboardValue(props.copy, "paid") },
          { value: "processing", label: displayDashboardValue(props.copy, "processing") },
          { value: "fulfilled", label: displayDashboardValue(props.copy, "fulfilled") },
          { value: "cancelled", label: displayDashboardValue(props.copy, "cancelled") }
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
        columns={[
          props.copy.orders.orderId,
          props.copy.common.customer,
          props.copy.common.status,
          props.copy.common.total,
          props.copy.common.fulfillment,
          props.copy.common.created,
          props.copy.common.details
        ]}
        rows={props.orders.map((order) => [
          <span key="order">
            <strong>{order.id}</strong>
            <small>{order.email}</small>
          </span>,
          [order.firstName, order.lastName].filter(Boolean).join(" ") || "-",
          displayDashboardValue(props.copy, order.status),
          formatCents(order.totalCents, props.locale, order.currency),
          order.fulfillment,
          formatDate(order.createdAt, props.locale),
          <QueueActionCell
            key="actions"
            actions={[{ label: props.copy.actions.view, onClick: () => void openOrder(order.id) }]}
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
              <strong>{props.copy.common.customer}:</strong> {detail.email}
            </p>
            <h4>{props.copy.orders.items}</h4>
            <Table
              columns={[props.copy.products.skuCode, props.copy.common.product, props.copy.common.total]}
              rows={(detail.items ?? []).map((item) => [
                item.skuCode,
                item.productName,
                formatCents(item.lineTotalCents, props.locale, detail.currency)
              ])}
            />
            {(detail.statusEvents ?? []).length > 0 ? (
              <>
                <h4>{props.copy.orders.statusHistory}</h4>
                <Table
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
              </>
            ) : null}
            <form
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
            </form>
          </>
        ) : null}
      </DetailDrawer>
    </>
  );
}

export function PaymentSessionsPanel(props: {
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
          session.fulfillment ?? "-",
          session.paymentMethod ?? "-",
          formatDate(session.expiresAt, props.locale),
          formatDate(session.createdAt, props.locale),
          session.status === "pending" && session.paymentMethod !== "card" ? (
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

export function ErpSyncJobsPanel(props: {
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
}) {
  return (
    <>
      <PanelHeader title={props.copy.erp.title} copy={props.copy.erp.copy} />
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
          job.status === "failed" || job.status === "retry_wait" ? (
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
    </>
  );
}

export function InventorySnapshotsPanel(props: {
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
      {props.canWrite ? (
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
          props.canWrite ? (
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
          props.canWrite ? (
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

function CmsJsonEditor(props: {
  copy: DashboardCopy;
  title: string;
  endpoint: string;
  locale: string;
  data: unknown;
  canWrite: boolean;
  onAction: ActionHandler;
}) {
  const [jsonDraft, setJsonDraft] = useState(() => cmsEditorValue(props.data));

  useEffect(() => {
    setJsonDraft(cmsEditorValue(props.data));
  }, [props.data]);

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
          canWrite={props.canWrite}
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
          canWrite={props.canWrite}
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
          canWrite={props.canWrite}
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
          canWrite={props.canWrite}
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
          canWrite={props.canWrite}
          onAction={props.onAction}
        />
      ) : null}

      {props.cmsSubTab === "moduleReadiness" ? (
        <form className="dashboard-card dashboard-quick-form">
          <h3>{props.copy.cms.readiness}</h3>
          <label className="field">
            <span>{props.copy.common.jsonPayload}</span>
            <textarea rows={16} readOnly value={JSON.stringify(props.moduleReadiness ?? {}, null, 2)} />
          </label>
        </form>
      ) : null}

      {props.cmsSubTab === "legalPages" ? (
        <div className="dashboard-form-grid">
          <Table
            columns={[
              props.copy.cms.slug,
              props.copy.cms.titleField,
              props.copy.common.status,
              props.copy.common.locale,
              props.copy.common.details
            ]}
            rows={props.legalPages.map((page) => [
              page.slug,
              page.title,
              displayDashboardValue(props.copy, page.status),
              page.locale,
              <button
                key="edit"
                className="button button-secondary"
                type="button"
                onClick={() => void openLegalPage(page.slug)}
              >
                {props.copy.actions.edit}
              </button>
            ])}
          />
          {legalSlug ? (
            <form
              className="dashboard-card dashboard-quick-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!props.canWrite) return;
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
              {props.canWrite ? (
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
          {props.canWrite ? (
            <QuickForm
              fields={[
                { label: props.copy.cms.slug, value: articleInput.slug, onChange: (slug) => setArticleInput({ ...articleInput, slug }) },
                { label: props.copy.cms.titleField, value: articleInput.title, onChange: (title) => setArticleInput({ ...articleInput, title }) },
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
            columns={[props.copy.cms.slug, props.copy.cms.titleField, props.copy.common.status, props.copy.common.locale]}
            rows={props.articles.map((article) => [
              article.slug,
              article.title,
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
          {summary.topPaths.length > 0 ? (
            <Table
              columns={[props.copy.operations.topPaths, props.copy.operations.count]}
              rows={summary.topPaths.map((row) => [row.path, String(row.count)])}
            />
          ) : null}
        </>
      ) : null}
      {props.alerts.length === 0 ? <p className="dashboard-empty">{props.copy.operations.empty}</p> : null}
      <Table
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
          <button
            key="queue"
            className="button button-secondary"
            type="button"
            onClick={() => props.onNavigateAlert(alert.key)}
          >
            {props.copy.actions.openQueue}
          </button>
        ])}
      />
    </>
  );
}

export function EmailOutboxPanel(props: {
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
      <form
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
      </form>
      {props.canWriteProvider ? (
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
          item.status === "failed" || item.status === "retry_wait" ? (
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
        columns={[
          props.copy.common.key,
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
            <button
              key={`edit-${template.id}`}
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedTemplateId(template.id)}
            >
              {props.copy.emailOutbox.editTemplate}
            </button>
          ];
        })}
      />
      {selectedTemplate && props.canWriteTemplates ? (
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

export function UsersPanel(props: {
  copy: DashboardCopy;
  input: { email: string; displayName: string; password: string; roleId: string };
  onChange: (value: { email: string; displayName: string; password: string; roleId: string }) => void;
  onSubmit: () => void;
  roles: Role[];
  users: AdminUser[];
}) {
  return (
    <>
      <PanelHeader title={props.copy.users.title} copy={props.copy.users.copy} />
      <form
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
      </form>
      <Table
        columns={[props.copy.common.email, props.copy.common.status, props.copy.users.kind, props.copy.users.roles]}
        rows={props.users.map((user) => [
          user.email,
          displayDashboardValue(props.copy, user.status),
          displayDashboardValue(props.copy, user.kind),
          user.userRoles?.map((role) => role.role.key).join(", ") || "-"
        ])}
      />
    </>
  );
}

export function RolesPanel(props: {
  copy: DashboardCopy;
  input: { key: string; name: string };
  onChange: (value: { key: string; name: string }) => void;
  onSubmit: () => void;
  roles: Role[];
}) {
  return (
    <>
      <PanelHeader title={props.copy.roles.title} copy={props.copy.roles.copy} />
      <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: props.input.name,
            onChange: (name) => props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
          },
          {
            label: props.copy.common.key,
            value: props.input.key,
            onChange: (key) => props.onChange({ ...props.input, key })
          }
        ]}
        onSubmit={props.onSubmit}
        title={props.copy.roles.create}
      />
      <Table
        columns={[props.copy.common.name, props.copy.common.key, props.copy.roles.permissions]}
        rows={props.roles.map((role) => [
          role.name,
          role.key,
          role.rolePermissions?.map((permission) => permission.permission.key).join(", ") || "-"
        ])}
      />
    </>
  );
}

export function DealersPanel(props: { copy: DashboardCopy; dealers: Dealer[] }) {
  return (
    <>
      <PanelHeader title={props.copy.dealers.title} copy={props.copy.dealers.copy} />
      <Table
        columns={[props.copy.common.name, props.copy.dealers.code, props.copy.common.status, props.copy.dealers.locations]}
        rows={props.dealers.map((dealer) => [
          dealer.name,
          dealer.code,
          displayDashboardValue(props.copy, dealer.status),
          dealer.locations
            ?.map((location) => [location.name, location.city, location.province].filter(Boolean).join(", "))
            .join(" / ") || "-"
        ])}
      />
    </>
  );
}

export function CrmContactsPanel(props: {
  copy: DashboardCopy;
  locale: string;
  contacts: CrmContactRecord[];
  meta: PageMeta;
  statusFilter: string;
  searchQuery: string;
  page: number;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onAction: ActionHandler;
  apiFetch: ApiFetch;
  onReload: () => Promise<void>;
  canUpdate: boolean;
  canPromote: boolean;
}) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmContactDetail | null>(null);
  const [stageDraft, setStageDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function openContact(id: string) {
    const payload = await props.apiFetch<ApiEnvelope<CrmContactDetail>>(`/dashboard/crm/contacts/${id}`);
    setDetail(payload.data);
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
      <div className="dashboard-filter">
        <label>
          <span>{props.copy.crm.search}</span>
          <input
            type="search"
            value={props.searchQuery}
            onChange={(event) => props.onSearchChange(event.target.value)}
          />
        </label>
      </div>
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
            <strong>{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email}</strong>
            <small>{contact.email}</small>
          </span>,
          displayDashboardStatus(props.copy, "crm", contact.stage),
          contact.source,
          displayDashboardStatus(props.copy, "crm", contact.erpSyncStatus),
          formatDate(contact.lastActivityAt, props.locale),
          <QueueActionCell
            key="actions"
            actions={[{ label: props.copy.actions.view, onClick: () => void openContact(contact.id) }]}
          />
        ])}
      />
      <DetailDrawer open={Boolean(drawerId)} title={detail?.email ?? props.copy.crm.title} onClose={closeDrawer}>
        {detail ? (
          <>
            <p>
              <strong>{[detail.firstName, detail.lastName].filter(Boolean).join(" ") || detail.email}</strong>
            </p>
            <p>{detail.phone ?? "-"}</p>
            <p>
              {props.copy.crm.stage}: {displayDashboardStatus(props.copy, "crm", detail.stage)}
            </p>
            <p>
              {props.copy.crm.erpSync}: {displayDashboardStatus(props.copy, "crm", detail.erpSyncStatus)}
            </p>
            {props.canUpdate ? (
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
            {props.canPromote ? (
              <button
                className="button button-primary"
                disabled={!detail.userId}
                title={detail.userId ? undefined : props.copy.crm.noUser}
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
            <h4>{props.copy.crm.orders}</h4>
            {detail.orders.length ? (
              <ul className="dashboard-notes-list">
                {detail.orders.map((order) => (
                  <li key={order.id}>
                    <strong>{order.id}</strong> — {displayDashboardValue(props.copy, order.status)} —{" "}
                    {formatCents(order.totalCents, props.locale, order.currency)} — {formatDate(order.createdAt, props.locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty">{props.copy.common.noRecords}</p>
            )}
            {detail.relatedLead ? (
              <>
                <h4>{props.copy.crm.relatedLead}</h4>
                <p>
                  {detail.relatedLead.topic} — {displayDashboardStatus(props.copy, "lead", detail.relatedLead.status)}
                </p>
              </>
            ) : null}
            {detail.erpLinks.length ? (
              <>
                <h4>{props.copy.crm.erpLinks}</h4>
                <ul className="dashboard-notes-list">
                  {detail.erpLinks.map((link) => (
                    <li key={link.id}>
                      {link.erpSystem}: {link.erpCustomerId}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {detail.syncJobs.length ? (
              <>
                <h4>{props.copy.crm.syncJobs}</h4>
                <ul className="dashboard-notes-list">
                  {detail.syncJobs.map((job) => (
                    <li key={job.id}>
                      {job.status}
                      {job.lastError ? ` — ${job.lastError}` : ""}
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
            <NotesList notes={detail.notes} locale={props.locale} />
            {props.canUpdate ? (
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
      </DetailDrawer>
    </>
  );
}
