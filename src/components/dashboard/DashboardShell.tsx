"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDashboardCopy, type DashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";

type ApiResult<T> = { data: T };
type TabKey =
  | "products"
  | "categories"
  | "pricing"
  | "promotions"
  | "users"
  | "roles"
  | "dealers"
  | "dealerApplications"
  | "contactLeads"
  | "productReviews"
  | "supportHandoffs"
  | "operations"
  | "emailOutbox"
  | "auditLogs";

type DashboardUser = {
  id: string;
  email: string;
  permissions: string[];
  roles: string[];
};

type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  status: string;
  category?: Category | null;
  skus?: Array<{
    id: string;
    skuCode: string;
    name: string;
    prices?: Array<{ amountCents: number; currency: string; status: string }>;
    erpMappings?: Array<{ erpSystem: string; erpSkuKey: string }>;
  }>;
};

type Price = {
  id: string;
  key: string;
  amountCents: number;
  currency: string;
  status: string;
  sku?: { skuCode: string; product?: { name: string } };
};

type Promotion = {
  id: string;
  key: string;
  name: string;
  status: string;
  discountLabel?: string | null;
};

type AdminUser = {
  id: string;
  email: string;
  kind: string;
  status: string;
  adminProfile?: { displayName?: string | null } | null;
  userRoles?: Array<{ role: { key: string; name: string } }>;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ permission: { key: string } }>;
};

type Dealer = {
  id: string;
  code: string;
  name: string;
  status: string;
  locations?: Array<{ name: string; city?: string | null; province?: string | null }>;
};

type DealerApplication = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  status: string;
  message?: string | null;
  notes?: Array<{ note: string; createdAt: string }>;
};

type ContactLead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  topic: string;
  city?: string | null;
  preferredDealer?: string | null;
  orderNumber?: string | null;
  message: string;
  status: string;
  assignedToUserId?: string | null;
  assignedDealerId?: string | null;
  notes?: Array<{ note: string; createdAt: string }>;
};

type ProductReviewQueueItem = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  nickname: string;
  email: string;
  status: string;
  product?: { name: string; slug: string } | null;
  notes?: Array<{ note: string; createdAt: string }>;
};

type EmailOutboxItem = {
  id: string;
  templateKey?: string | null;
  toEmail: string;
  subject?: string | null;
  status: string;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
};

type EmailTemplateItem = {
  id: string;
  key: string;
  name: string;
  status: string;
};

type SupportHandoffItem = {
  id: string;
  channel: string;
  sourcePath: string;
  status: string;
  dealerId?: string | null;
  cartId?: string | null;
  createdAt: string;
};

type AuditLogRecord = {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  createdAt: string;
};

type OperationalAlert = {
  key: string;
  severity: "warning" | "critical";
  title: string;
  count: number;
  actionPath: string;
};

type DashboardData = {
  categories: Category[];
  products: Product[];
  pricing: Price[];
  promotions: Promotion[];
  users: AdminUser[];
  roles: Role[];
  dealers: Dealer[];
  dealerApplications: DealerApplication[];
  contactLeads: ContactLead[];
  productReviews: ProductReviewQueueItem[];
  supportHandoffs: SupportHandoffItem[];
  operationAlerts: OperationalAlert[];
  emailOutbox: EmailOutboxItem[];
  emailTemplates: EmailTemplateItem[];
  auditLogs: AuditLogRecord[];
};

type QueueFilters = {
  contactLeads: string;
  dealerApplications: string;
  productReviews: string;
  supportHandoffs: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "https://api.vanstro.ca/api/v1";

const emptyData: DashboardData = {
  categories: [],
  products: [],
  pricing: [],
  promotions: [],
  users: [],
  roles: [],
  dealers: [],
  dealerApplications: [],
  contactLeads: [],
  productReviews: [],
  supportHandoffs: [],
  operationAlerts: [],
  emailOutbox: [],
  emailTemplates: [],
  auditLogs: []
};

const tabs: TabKey[] = [
  "products", "categories", "pricing", "promotions", "users", "roles", "dealers",
  "dealerApplications", "contactLeads", "productReviews", "supportHandoffs", "operations", "emailOutbox", "auditLogs"
];

function withQuery(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatCents(amountCents: number, locale: string, currency = "CAD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function displayDashboardValue(copy: DashboardCopy, value: string) {
  return value in copy.values
    ? copy.values[value as keyof DashboardCopy["values"]]
    : value;
}

function displayDashboardStatus(
  copy: DashboardCopy,
  domain: keyof DashboardCopy["statusValues"],
  value: string
) {
  const values = copy.statusValues[domain] as Record<string, string>;
  return values[value] ?? displayDashboardValue(copy, value);
}

function readStoredToken() {
  if (typeof window === "undefined") return "";

  return window.sessionStorage.getItem("vanstro-dashboard-token") ?? "";
}

function storeToken(token: string) {
  window.sessionStorage.setItem("vanstro-dashboard-token", token);
}

function clearStoredToken() {
  window.sessionStorage.removeItem("vanstro-dashboard-token");
}

export function DashboardShell({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getDashboardCopy(locale);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [data, setData] = useState<DashboardData>(emptyData);
  const [queueFilters, setQueueFilters] = useState<QueueFilters>({
    contactLeads: "",
    dealerApplications: "",
    productReviews: "",
    supportHandoffs: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"status" | "error">("status");
  const [loginInput, setLoginInput] = useState({
    email: "",
    password: ""
  });
  const [categoryInput, setCategoryInput] = useState({ name: "", slug: "" });
  const [productInput, setProductInput] = useState({
    name: "",
    slug: "",
    categoryId: "",
    status: "draft"
  });
  const [skuInput, setSkuInput] = useState({
    productId: "",
    skuCode: "",
    name: ""
  });
  const [assetInput, setAssetInput] = useState({
    productId: "",
    url: "",
    altText: ""
  });
  const [priceInput, setPriceInput] = useState({
    skuId: "",
    amountCents: "",
    key: ""
  });
  const [promotionInput, setPromotionInput] = useState({
    name: "",
    key: "",
    status: "draft"
  });
  const [userInput, setUserInput] = useState({
    email: "",
    displayName: "",
    password: "",
    roleId: ""
  });
  const [roleInput, setRoleInput] = useState({ key: "", name: "" });

  async function apiFetch<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiResult<T>
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        (locale === "en-CA" && payload && "error" in payload && payload.error) ||
          copy.errors.requestFailedWith(response.status)
      );
    }

    return (payload as ApiResult<T>).data;
  }

  async function loadDashboard(nextToken = token, filters: QueueFilters = queueFilters) {
    if (!nextToken) return;

    setLoading(true);
    setMessage("");
    setMessageTone("status");

    try {
      const headers = { Authorization: `Bearer ${nextToken}` };
      const fetchWithToken = async <T,>(path: string) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          headers: { Accept: "application/json", ...headers }
        });
        const payload = (await response.json()) as ApiResult<T>;

        if (!response.ok) throw new Error(copy.errors.loadPathFailed(path));

        return payload.data;
      };
      const [
        categories,
        products,
        pricing,
        promotions,
        users,
        roles,
        dealers,
        dealerApplications,
        contactLeads,
        productReviews,
        supportHandoffs,
        operationAlerts,
        emailOutbox,
        emailTemplates,
        auditLogs
      ] = await Promise.all([
        fetchWithToken<Category[]>("/dashboard/categories"),
        fetchWithToken<Product[]>("/dashboard/products"),
        fetchWithToken<Price[]>("/dashboard/pricing"),
        fetchWithToken<Promotion[]>("/dashboard/promotions"),
        fetchWithToken<AdminUser[]>("/dashboard/users"),
        fetchWithToken<Role[]>("/dashboard/roles"),
        fetchWithToken<Dealer[]>("/dashboard/dealers"),
        fetchWithToken<DealerApplication[]>(
          withQuery("/dashboard/dealer-applications", { status: filters.dealerApplications, pageSize: "50" })
        ),
        fetchWithToken<ContactLead[]>(
          withQuery("/dashboard/contact-leads", { status: filters.contactLeads, pageSize: "50" })
        ),
        fetchWithToken<ProductReviewQueueItem[]>(
          withQuery("/dashboard/product-reviews", { status: filters.productReviews, pageSize: "50" })
        ),
        fetchWithToken<SupportHandoffItem[]>(
          withQuery("/dashboard/support/handoffs", { status: filters.supportHandoffs, pageSize: "50" })
        ),
        fetchWithToken<OperationalAlert[]>("/dashboard/operations/alerts"),
        fetchWithToken<EmailOutboxItem[]>(withQuery("/dashboard/email/outbox", { pageSize: "50" })),
        fetchWithToken<EmailTemplateItem[]>("/dashboard/email/templates"),
        fetchWithToken<AuditLogRecord[]>("/dashboard/audit-logs")
      ]);

      setData({
        categories,
        products,
        pricing,
        promotions,
        users,
        roles,
        dealers,
        dealerApplications,
        contactLeads,
        productReviews,
        supportHandoffs,
        operationAlerts,
        emailOutbox,
        emailTemplates,
        auditLogs
      });
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : copy.errors.dashboardLoadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function restoreSession() {
    const storedToken = readStoredToken();

    if (!storedToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const payload = (await response.json()) as ApiResult<{ user: DashboardUser }>;

      if (!response.ok) throw new Error(copy.errors.storedSessionExpired);

      setToken(storedToken);
      setUser(payload.data.user);
      await loadDashboard(storedToken);
    } catch {
      clearStoredToken();
    }
  }

  useEffect(() => {
    void restoreSession();
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageTone("status");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(loginInput)
      });
      const payload = (await response.json()) as ApiResult<{
        accessToken: string;
        user: DashboardUser;
      }>;

      if (!response.ok) throw new Error(copy.errors.loginFailed);

      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      storeToken(payload.data.accessToken);
      await loadDashboard(payload.data.accessToken);
      setMessage(copy.messages.signedIn);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : copy.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }

    clearStoredToken();
    setToken("");
    setUser(null);
    setData(emptyData);
    setMessage(copy.messages.signedOut);
  }

  async function updateQueueFilter(key: keyof QueueFilters, value: string) {
    const nextFilters = { ...queueFilters, [key]: value };
    setQueueFilters(nextFilters);
    await loadDashboard(token, nextFilters);
  }

  async function submitJson<T>(
    path: string,
    body: T,
    options: { method?: string; success: string }
  ) {
    setLoading(true);
    setMessage("");
    setMessageTone("status");

    try {
      await apiFetch(path, {
        method: options.method ?? "POST",
        body: JSON.stringify(body)
      });
      setMessage(options.success);
      await loadDashboard();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : copy.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-login-shell">
          <div>
            <span className="eyebrow">{copy.login.eyebrow}</span>
            <h1>{copy.login.title}</h1>
            <p>
              {copy.login.intro} {copy.login.apiBase} <code>{API_BASE_URL}</code>
            </p>
          </div>
          <form className="dashboard-card dashboard-login-card" onSubmit={submitLogin}>
            <label className="field">
              <span>{copy.login.email}</span>
              <input
                autoComplete="email"
                type="email"
                value={loginInput.email}
                onChange={(event) =>
                  setLoginInput((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
              />
            </label>
            <label className="field">
              <span>{copy.login.password}</span>
              <input
                autoComplete="current-password"
                type="password"
                value={loginInput.password}
                onChange={(event) =>
                  setLoginInput((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                required
              />
            </label>
            <button className="button button-primary" disabled={loading} type="submit">
              {loading ? copy.login.signingIn : copy.login.signIn}
            </button>
            {message ? <p className="dashboard-message" role={messageTone === "error" ? "alert" : "status"}>{message}</p> : null}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">{copy.hero.eyebrow}</span>
          <h1>{copy.hero.title}</h1>
          <p>
            {copy.hero.signedInAs(user.email)}
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="button button-secondary" onClick={() => loadDashboard()} type="button">
            {loading ? copy.hero.refreshing : copy.hero.refresh}
          </button>
          <button className="button button-primary" onClick={logout} type="button">
            {copy.hero.signOut}
          </button>
        </div>
      </section>

      <section className="dashboard-stats" aria-label={copy.hero.countsLabel}>
        <StatCard label={copy.stats.products} value={formatNumber(data.products.length, locale)} />
        <StatCard label={copy.stats.categories} value={formatNumber(data.categories.length, locale)} />
        <StatCard label={copy.stats.prices} value={formatNumber(data.pricing.length, locale)} />
        <StatCard label={copy.stats.promotions} value={formatNumber(data.promotions.length, locale)} />
        <StatCard label={copy.stats.users} value={formatNumber(data.users.length, locale)} />
        <StatCard label={copy.stats.dealers} value={formatNumber(data.dealers.length, locale)} />
        <StatCard label={copy.stats.applications} value={formatNumber(data.dealerApplications.length, locale)} />
        <StatCard label={copy.stats.leads} value={formatNumber(data.contactLeads.length, locale)} />
        <StatCard label={copy.stats.reviews} value={formatNumber(data.productReviews.length, locale)} />
        <StatCard label={copy.stats.opsAlerts} value={formatNumber(data.operationAlerts.length, locale)} />
      </section>

      {message ? <p className="dashboard-message" role={messageTone === "error" ? "alert" : "status"}>{message}</p> : null}

      <section className="dashboard-shell-grid">
        <aside className="dashboard-sidebar" aria-label={copy.hero.sectionsLabel}>
          {tabs.map((tab) => (
            <button
              className={tab === activeTab ? "active" : ""}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {copy.tabs[tab]}
            </button>
          ))}
        </aside>

        <section className="dashboard-panel">
          {activeTab === "products" ? (
            <ProductsPanel
              copy={copy}
              assetInput={assetInput}
              categories={data.categories}
              onAssetChange={setAssetInput}
              onProductChange={setProductInput}
              onSkuChange={setSkuInput}
              onSubmitAsset={() =>
                submitJson(`/dashboard/products/${assetInput.productId}/assets`, assetInput, {
                  success: copy.messages.assetCreated
                })
              }
              onSubmitProduct={() =>
                submitJson("/dashboard/products", productInput, {
                  success: copy.messages.productCreated
                })
              }
              onSubmitSku={() =>
                submitJson(`/dashboard/products/${skuInput.productId}/skus`, skuInput, {
                  success: copy.messages.skuCreated
                })
              }
              productInput={productInput}
              products={data.products}
              skuInput={skuInput}
            />
          ) : null}

          {activeTab === "categories" ? (
            <CategoriesPanel
              copy={copy}
              categories={data.categories}
              input={categoryInput}
              onChange={setCategoryInput}
              onSubmit={() =>
                submitJson("/dashboard/categories", {
                  ...categoryInput,
                  slug: categoryInput.slug || slugify(categoryInput.name)
                }, {
                  success: copy.messages.categoryCreated
                })
              }
            />
          ) : null}

          {activeTab === "pricing" ? (
            <PricingPanel
              copy={copy}
              locale={locale}
              input={priceInput}
              onChange={setPriceInput}
              onSubmit={() =>
                submitJson("/dashboard/pricing", {
                  ...priceInput,
                  amountCents: Number(priceInput.amountCents)
                }, {
                  success: copy.messages.priceCreated
                })
              }
              prices={data.pricing}
              products={data.products}
            />
          ) : null}

          {activeTab === "promotions" ? (
            <PromotionsPanel
              copy={copy}
              input={promotionInput}
              onChange={setPromotionInput}
              onSubmit={() =>
                submitJson("/dashboard/promotions", {
                  ...promotionInput,
                  key: promotionInput.key || slugify(promotionInput.name)
                }, {
                  success: copy.messages.promotionCreated
                })
              }
              promotions={data.promotions}
            />
          ) : null}

          {activeTab === "users" ? (
            <UsersPanel
              copy={copy}
              input={userInput}
              onChange={setUserInput}
              onSubmit={() =>
                submitJson("/dashboard/users", {
                  email: userInput.email,
                  displayName: userInput.displayName,
                  password: userInput.password,
                  kind: "admin",
                  status: "active",
                  roleIds: userInput.roleId ? [userInput.roleId] : []
                }, {
                  success: copy.messages.adminUserCreated
                })
              }
              roles={data.roles}
              users={data.users}
            />
          ) : null}

          {activeTab === "roles" ? (
            <RolesPanel
              copy={copy}
              input={roleInput}
              onChange={setRoleInput}
              onSubmit={() =>
                submitJson("/dashboard/roles", roleInput, {
                  success: copy.messages.roleCreated
                })
              }
              roles={data.roles}
            />
          ) : null}

          {activeTab === "dealers" ? <DealersPanel copy={copy} dealers={data.dealers} /> : null}

          {activeTab === "dealerApplications" ? (
            <DealerApplicationsPanel
              copy={copy}
              applications={data.dealerApplications}
              onAction={submitJson}
              onFilterChange={(value) => void updateQueueFilter("dealerApplications", value)}
              statusFilter={queueFilters.dealerApplications}
            />
          ) : null}

          {activeTab === "contactLeads" ? (
            <ContactLeadsPanel
              copy={copy}
              leads={data.contactLeads}
              onAction={submitJson}
              onFilterChange={(value) => void updateQueueFilter("contactLeads", value)}
              statusFilter={queueFilters.contactLeads}
            />
          ) : null}

          {activeTab === "productReviews" ? (
            <ProductReviewsPanel
              copy={copy}
              reviews={data.productReviews}
              onAction={submitJson}
              onFilterChange={(value) => void updateQueueFilter("productReviews", value)}
              statusFilter={queueFilters.productReviews}
            />
          ) : null}

          {activeTab === "supportHandoffs" ? (
            <SupportHandoffsPanel
              copy={copy}
              handoffs={data.supportHandoffs}
              locale={locale}
              onAction={submitJson}
              onFilterChange={(value) => void updateQueueFilter("supportHandoffs", value)}
              statusFilter={queueFilters.supportHandoffs}
            />
          ) : null}

          {activeTab === "operations" ? <OperationsPanel alerts={data.operationAlerts} copy={copy} /> : null}

          {activeTab === "emailOutbox" ? (
            <EmailOutboxPanel
              copy={copy}
              items={data.emailOutbox}
              locale={locale}
              onAction={submitJson}
              templates={data.emailTemplates}
            />
          ) : null}

          {activeTab === "auditLogs" ? <AuditLogsPanel copy={copy} locale={locale} logs={data.auditLogs} /> : null}
        </section>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelHeader({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="dashboard-panel-header">
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function ProductsPanel(props: {
  copy: DashboardCopy;
  assetInput: { productId: string; url: string; altText: string };
  categories: Category[];
  onAssetChange: (value: { productId: string; url: string; altText: string }) => void;
  onProductChange: (value: {
    name: string;
    slug: string;
    categoryId: string;
    status: string;
  }) => void;
  onSkuChange: (value: { productId: string; skuCode: string; name: string }) => void;
  onSubmitAsset: () => void;
  onSubmitProduct: () => void;
  onSubmitSku: () => void;
  productInput: { name: string; slug: string; categoryId: string; status: string };
  products: Product[];
  skuInput: { productId: string; skuCode: string; name: string };
}) {
  return (
    <>
      <PanelHeader
        title={props.copy.products.title}
        copy={props.copy.products.copy}
      />
      <div className="dashboard-form-grid">
        <QuickForm
          fields={[
            {
              label: props.copy.common.name,
              value: props.productInput.name,
              onChange: (name) =>
                props.onProductChange({
                  ...props.productInput,
                  name,
                  slug: props.productInput.slug || slugify(name)
                })
            },
            {
              label: props.copy.common.slug,
              value: props.productInput.slug,
              onChange: (slug) =>
                props.onProductChange({ ...props.productInput, slug })
            }
          ]}
          onSubmit={props.onSubmitProduct}
          title={props.copy.products.createProduct}
        >
          <label className="field">
            <span>{props.copy.common.category}</span>
            <select
              value={props.productInput.categoryId}
              onChange={(event) =>
                props.onProductChange({
                  ...props.productInput,
                  categoryId: event.target.value
                })
              }
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

        <QuickForm
          fields={[
            {
              label: props.copy.products.productId,
              value: props.skuInput.productId,
              onChange: (productId) =>
                props.onSkuChange({ ...props.skuInput, productId })
            },
            {
              label: props.copy.products.skuCode,
              value: props.skuInput.skuCode,
              onChange: (skuCode) =>
                props.onSkuChange({ ...props.skuInput, skuCode })
            },
            {
              label: props.copy.common.name,
              value: props.skuInput.name,
              onChange: (name) => props.onSkuChange({ ...props.skuInput, name })
            }
          ]}
          onSubmit={props.onSubmitSku}
          title={props.copy.products.addSku}
        />

        <QuickForm
          fields={[
            {
              label: props.copy.products.productId,
              value: props.assetInput.productId,
              onChange: (productId) =>
                props.onAssetChange({ ...props.assetInput, productId })
            },
            {
              label: props.copy.products.assetUrl,
              value: props.assetInput.url,
              onChange: (url) => props.onAssetChange({ ...props.assetInput, url })
            },
            {
              label: props.copy.products.altText,
              value: props.assetInput.altText,
              onChange: (altText) =>
                props.onAssetChange({ ...props.assetInput, altText })
            }
          ]}
          onSubmit={props.onSubmitAsset}
          title={props.copy.products.addAsset}
        />
      </div>

      <Table
        columns={[props.copy.common.name, props.copy.common.status, props.copy.common.category, props.copy.products.skus]}
        rows={props.products.map((product) => [
          <span key="name">
            <strong>{product.name}</strong>
            <small>{product.id}</small>
          </span>,
          displayDashboardValue(props.copy, product.status),
          product.category?.name ?? "-",
          product.skus?.map((sku) => sku.skuCode).join(", ") || "-"
        ])}
      />
    </>
  );
}

function CategoriesPanel(props: {
  copy: DashboardCopy;
  categories: Category[];
  input: { name: string; slug: string };
  onChange: (value: { name: string; slug: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <PanelHeader title={props.copy.categories.title} copy={props.copy.categories.copy} />
      <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: props.input.name,
            onChange: (name) =>
              props.onChange({ ...props.input, name, slug: props.input.slug || slugify(name) })
          },
          {
            label: props.copy.common.slug,
            value: props.input.slug,
            onChange: (slug) => props.onChange({ ...props.input, slug })
          }
        ]}
        onSubmit={props.onSubmit}
        title={props.copy.categories.create}
      />
      <Table
        columns={[props.copy.common.name, props.copy.common.slug, props.copy.categories.active]}
        rows={props.categories.map((category) => [
          category.name,
          category.slug,
          category.isActive === false ? props.copy.common.no : props.copy.common.yes
        ])}
      />
    </>
  );
}

function PricingPanel(props: {
  copy: DashboardCopy;
  locale: string;
  input: { skuId: string; amountCents: string; key: string };
  onChange: (value: { skuId: string; amountCents: string; key: string }) => void;
  onSubmit: () => void;
  prices: Price[];
  products: Product[];
}) {
  const skus = props.products.flatMap((product) =>
    (product.skus ?? []).map((sku) => ({ ...sku, productName: product.name }))
  );

  return (
    <>
      <PanelHeader title={props.copy.pricing.title} copy={props.copy.pricing.copy} />
      <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <h3>{props.copy.pricing.create}</h3>
        <label className="field">
          <span>{props.copy.products.skus}</span>
          <select
            value={props.input.skuId}
            onChange={(event) =>
              props.onChange({ ...props.input, skuId: event.target.value })
            }
          >
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
            value={props.input.amountCents}
            onChange={(event) =>
              props.onChange({ ...props.input, amountCents: event.target.value })
            }
            required
          />
        </label>
        <label className="field">
          <span>{props.copy.common.key}</span>
          <input
            value={props.input.key}
            onChange={(event) =>
              props.onChange({ ...props.input, key: event.target.value })
            }
            placeholder="retail:SKU"
          />
        </label>
        <button className="button button-primary" type="submit">
          {props.copy.pricing.create}
        </button>
      </form>
      <Table
        columns={[props.copy.common.key, props.copy.products.skus, props.copy.pricing.amount, props.copy.common.status]}
        rows={props.prices.map((price) => [
          price.key,
          price.sku?.skuCode ?? "-",
          formatCents(price.amountCents, props.locale, price.currency),
          displayDashboardValue(props.copy, price.status)
        ])}
      />
    </>
  );
}

function PromotionsPanel(props: {
  copy: DashboardCopy;
  input: { name: string; key: string; status: string };
  onChange: (value: { name: string; key: string; status: string }) => void;
  onSubmit: () => void;
  promotions: Promotion[];
}) {
  return (
    <>
      <PanelHeader title={props.copy.promotions.title} copy={props.copy.promotions.copy} />
      <QuickForm
        fields={[
          {
            label: props.copy.common.name,
            value: props.input.name,
            onChange: (name) =>
              props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
          },
          {
            label: props.copy.common.key,
            value: props.input.key,
            onChange: (key) => props.onChange({ ...props.input, key })
          }
        ]}
        onSubmit={props.onSubmit}
        title={props.copy.promotions.create}
      />
      <Table
        columns={[props.copy.common.name, props.copy.common.key, props.copy.common.status, props.copy.promotions.label]}
        rows={props.promotions.map((promotion) => [
          promotion.name,
          promotion.key,
          displayDashboardStatus(props.copy, "promotion", promotion.status),
          promotion.discountLabel ?? "-"
        ])}
      />
    </>
  );
}

function UsersPanel(props: {
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
            onChange={(event) =>
              props.onChange({ ...props.input, displayName: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>{props.copy.users.temporaryPassword}</span>
          <input
            type="password"
            value={props.input.password}
            onChange={(event) =>
              props.onChange({ ...props.input, password: event.target.value })
            }
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

function RolesPanel(props: {
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
            onChange: (name) =>
              props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
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

function DealersPanel({ copy, dealers }: { copy: DashboardCopy; dealers: Dealer[] }) {
  return (
    <>
      <PanelHeader title={copy.dealers.title} copy={copy.dealers.copy} />
      <Table
        columns={[copy.common.name, copy.dealers.code, copy.common.status, copy.dealers.locations]}
        rows={dealers.map((dealer) => [
          dealer.name,
          dealer.code,
          displayDashboardValue(copy, dealer.status),
          dealer.locations
            ?.map((location) => [location.name, location.city, location.province].filter(Boolean).join(", "))
            .join(" / ") || "-"
        ])}
      />
    </>
  );
}

function DealerApplicationsPanel(props: {
  copy: DashboardCopy;
  applications: DealerApplication[];
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title={props.copy.applications.title}
        copy={props.copy.applications.copy}
      />
      <QueueStatusFilter
        copy={props.copy}
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
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: props.copy.applications.applicationId },
            {
              name: "status",
              label: props.copy.common.status,
              options: ["submitted", "under_review", "approved", "rejected", "archived"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/dealer-applications/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: props.copy.messages.applicationStatusUpdated }
            )
          }
          title={props.copy.applications.update}
        />
        <ActionForm
          fields={[
            { name: "id", label: props.copy.applications.applicationId },
            { name: "note", label: props.copy.common.note }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/dealer-applications/${body.id}/notes`,
              { note: body.note },
              { success: props.copy.messages.applicationNoteAdded }
            )
          }
          title={props.copy.applications.addNote}
        />
      </div>
      <Table
        columns={[props.copy.applications.company, props.copy.applications.contact, props.copy.applications.market, props.copy.common.status, props.copy.common.message]}
        rows={props.applications.map((application) => [
          <span key="company">
            <strong>{application.companyName}</strong>
            <small>{application.id}</small>
          </span>,
          `${application.contactName} / ${application.email}`,
          `${application.city}, ${application.province}`,
          displayDashboardStatus(props.copy, "application", application.status),
          application.message ?? "-"
        ])}
      />
    </>
  );
}

function QueueStatusFilter(props: {
  copy: DashboardCopy;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="dashboard-filter">
      <span>{props.copy.common.status}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContactLeadsPanel(props: {
  copy: DashboardCopy;
  leads: ContactLead[];
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title={props.copy.leads.title}
        copy={props.copy.leads.copy}
      />
      <QueueStatusFilter
        copy={props.copy}
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
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: props.copy.leads.leadId },
            {
              name: "status",
              label: props.copy.common.status,
              options: ["new", "routed", "closed", "spam"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: props.copy.messages.leadStatusUpdated }
            )
          }
          title={props.copy.leads.update}
        />
        <ActionForm
          fields={[
            { name: "id", label: props.copy.leads.leadId },
            { name: "assignedToUserId", label: props.copy.leads.assignedUserId, required: false },
            { name: "assignedDealerId", label: props.copy.leads.assignedDealerId, required: false }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/assign`,
              {
                assignedToUserId: body.assignedToUserId,
                assignedDealerId: body.assignedDealerId
              },
              { success: props.copy.messages.leadAssigned }
            )
          }
          title={props.copy.leads.assign}
        />
        <ActionForm
          fields={[
            { name: "id", label: props.copy.leads.leadId },
            { name: "note", label: props.copy.common.note }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/notes`,
              { note: body.note },
              { success: props.copy.messages.leadNoteAdded }
            )
          }
          title={props.copy.leads.addNote}
        />
      </div>
      <Table
        columns={[props.copy.common.name, props.copy.leads.topic, props.copy.common.status, props.copy.leads.location, props.copy.common.message]}
        rows={props.leads.map((lead) => [
          <span key="lead">
            <strong>{lead.name}</strong>
            <small>{lead.id}</small>
            <small>{lead.email}</small>
          </span>,
          lead.topic,
          displayDashboardStatus(props.copy, "lead", lead.status),
          [lead.city, lead.preferredDealer].filter(Boolean).join(" / ") || "-",
          lead.message
        ])}
      />
    </>
  );
}

function ProductReviewsPanel(props: {
  copy: DashboardCopy;
  reviews: ProductReviewQueueItem[];
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title={props.copy.reviews.title}
        copy={props.copy.reviews.copy}
      />
      <QueueStatusFilter
        copy={props.copy}
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
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: props.copy.reviews.reviewId },
            {
              name: "status",
              label: props.copy.common.status,
              options: ["pending", "published", "rejected", "archived"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/product-reviews/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: props.copy.messages.reviewStatusUpdated }
            )
          }
          title={props.copy.reviews.moderate}
        />
        <ActionForm
          fields={[
            { name: "id", label: props.copy.reviews.reviewId },
            { name: "note", label: props.copy.common.note }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/product-reviews/${body.id}/notes`,
              { note: body.note },
              { success: props.copy.messages.reviewNoteAdded }
            )
          }
          title={props.copy.reviews.addNote}
        />
      </div>
      <Table
        columns={[props.copy.common.product, props.copy.reviews.reviewer, props.copy.reviews.rating, props.copy.common.status, props.copy.reviews.review]}
        rows={props.reviews.map((review) => [
          <span key="product">
            <strong>{review.product?.name ?? props.copy.reviews.fallbackProduct}</strong>
            <small>{review.id}</small>
          </span>,
          `${review.nickname} / ${review.email}`,
          `${review.rating}/5`,
          displayDashboardStatus(props.copy, "review", review.status),
          <span key="review">
            <strong>{review.title?.trim() || props.copy.reviews.untitled}</strong>
            <small>{review.body}</small>
          </span>
        ])}
      />
    </>
  );
}

function SupportHandoffsPanel(props: {
  copy: DashboardCopy;
  handoffs: SupportHandoffItem[];
  locale: string;
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader title={props.copy.handoffs.title} copy={props.copy.handoffs.copy} />
      <QueueStatusFilter
        copy={props.copy}
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
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: props.copy.handoffs.handoffId },
            {
              name: "status",
              label: props.copy.common.status,
              options: ["new", "in_progress", "resolved", "closed"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/support/handoffs/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: props.copy.messages.handoffStatusUpdated }
            )
          }
          title={props.copy.handoffs.update}
        />
      </div>
      <Table
        columns={[
          props.copy.handoffs.channel,
          props.copy.handoffs.sourcePath,
          props.copy.common.status,
          props.copy.common.created
        ]}
        rows={props.handoffs.map((handoff) => [
          <span key="channel">
            <strong>{handoff.channel}</strong>
            <small>{handoff.id}</small>
          </span>,
          handoff.sourcePath,
          displayDashboardStatus(props.copy, "handoff", handoff.status),
          formatDate(handoff.createdAt, props.locale)
        ])}
      />
    </>
  );
}

function EmailOutboxPanel({
  copy,
  items,
  locale,
  templates,
  onAction
}: {
  copy: DashboardCopy;
  items: EmailOutboxItem[];
  locale: string;
  templates: EmailTemplateItem[];
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title={copy.emailOutbox.title}
        copy={copy.emailOutbox.copy}
      />
      <Table
        columns={[
          copy.emailOutbox.template,
          copy.emailOutbox.recipient,
          copy.common.status,
          copy.emailOutbox.attempts,
          copy.emailOutbox.lastError,
          copy.common.created,
          copy.emailOutbox.retry
        ]}
        rows={items.map((item) => [
          item.templateKey ?? "-",
          item.toEmail,
          displayDashboardValue(copy, item.status),
          String(item.attemptCount),
          item.lastError ?? "-",
          formatDate(item.createdAt, locale),
          item.status === "failed" || item.status === "retry_wait" ? (
            <button
              key={`retry-${item.id}`}
              className="button button-secondary"
              type="button"
              onClick={() =>
                void onAction(`/dashboard/email/outbox/${item.id}/retry`, {}, {
                  method: "POST",
                  success: copy.messages.emailRetried
                })
              }
            >
              {copy.emailOutbox.retry}
            </button>
          ) : (
            "-"
          )
        ])}
      />
      <PanelHeader
        title={copy.emailOutbox.templatesTitle}
        copy={copy.emailOutbox.templatesCopy}
      />
      <Table
        columns={[copy.common.key, copy.common.name, copy.common.status]}
        rows={templates.map((template) => [
          template.key,
          template.name,
          displayDashboardValue(copy, template.status)
        ])}
      />
    </>
  );
}

function OperationsPanel({ alerts, copy }: { alerts: OperationalAlert[]; copy: DashboardCopy }) {
  return (
    <>
      <PanelHeader
        title={copy.operations.title}
        copy={copy.operations.copy}
      />
      {alerts.length === 0 ? <p className="dashboard-empty">{copy.operations.empty}</p> : null}
      <Table
        columns={[copy.operations.severity, copy.operations.alert, copy.operations.count, copy.operations.queue]}
        rows={alerts.map((alert) => [
          displayDashboardValue(copy, alert.severity),
          alert.title,
          String(alert.count),
          alert.actionPath
        ])}
      />
    </>
  );
}

function AuditLogsPanel({ copy, locale, logs }: { copy: DashboardCopy; locale: string; logs: AuditLogRecord[] }) {
  return (
    <>
      <PanelHeader
        title={copy.auditLogs.title}
        copy={copy.auditLogs.copy}
      />
      <Table
        columns={[copy.auditLogs.action, copy.auditLogs.resource, copy.auditLogs.resourceId, copy.common.created]}
        rows={logs.map((log) => [
          log.action,
          log.resourceType,
          log.resourceId ?? "-",
          formatDate(log.createdAt, locale)
        ])}
      />
    </>
  );
}

function ActionForm(props: {
  fields: Array<{ name: string; label: string; options?: string[]; required?: boolean }>;
  onSubmit: (body: Record<string, string>) => void;
  title: string;
}) {
  const { locale } = useLocale();
  const copy = getDashboardCopy(locale);

  return (
    <form
      className="dashboard-card dashboard-quick-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const body = Object.fromEntries(
          [...formData.entries()].map(([key, value]) => [key, String(value).trim()])
        );

        props.onSubmit(body);
        event.currentTarget.reset();
      }}
    >
      <h3>{props.title}</h3>
      {props.fields.map((field) => (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          {field.options ? (
            <select name={field.name} required={field.required ?? true}>
              <option value="">{copy.common.select}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {displayDashboardValue(copy, option)}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.name} required={field.required ?? true} />
          )}
        </label>
      ))}
      <button className="button button-primary" type="submit">
        {props.title}
      </button>
    </form>
  );
}

function QuickForm(props: {
  children?: ReactNode;
  fields: Array<{ label: string; value: string; onChange: (value: string) => void }>;
  onSubmit: () => void;
  title: string;
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
          <input value={field.value} onChange={(event) => field.onChange(event.target.value)} />
        </label>
      ))}
      {props.children}
      <button className="button button-primary" type="submit">
        {props.title}
      </button>
    </form>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  const { locale } = useLocale();
  const copy = getDashboardCopy(locale);

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{copy.common.noRecords}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
