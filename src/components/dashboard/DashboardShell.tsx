"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

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
  operationAlerts: OperationalAlert[];
  emailOutbox: EmailOutboxItem[];
  auditLogs: AuditLogRecord[];
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
  operationAlerts: [],
  emailOutbox: [],
  auditLogs: []
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "pricing", label: "Pricing" },
  { key: "promotions", label: "Promotions" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "dealers", label: "Dealers" },
  { key: "dealerApplications", label: "Applications" },
  { key: "contactLeads", label: "Leads" },
  { key: "productReviews", label: "Reviews" },
  { key: "operations", label: "Operations" },
  { key: "emailOutbox", label: "Email outbox" },
  { key: "auditLogs", label: "Audit logs" }
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatCents(amountCents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

export function DashboardShell() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loginInput, setLoginInput] = useState({
    email: "admin@vanstro.local",
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
        (payload && "error" in payload && payload.error) ||
          `Request failed with ${response.status}`
      );
    }

    return (payload as ApiResult<T>).data;
  }

  async function loadDashboard(nextToken = token) {
    if (!nextToken) return;

    setLoading(true);
    setMessage("");

    try {
      const headers = { Authorization: `Bearer ${nextToken}` };
      const fetchWithToken = async <T,>(path: string) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          headers: { Accept: "application/json", ...headers }
        });
        const payload = (await response.json()) as ApiResult<T>;

        if (!response.ok) throw new Error(`Failed to load ${path}`);

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
        operationAlerts,
        emailOutbox,
        auditLogs
      ] = await Promise.all([
        fetchWithToken<Category[]>("/dashboard/categories"),
        fetchWithToken<Product[]>("/dashboard/products"),
        fetchWithToken<Price[]>("/dashboard/pricing"),
        fetchWithToken<Promotion[]>("/dashboard/promotions"),
        fetchWithToken<AdminUser[]>("/dashboard/users"),
        fetchWithToken<Role[]>("/dashboard/roles"),
        fetchWithToken<Dealer[]>("/dashboard/dealers"),
        fetchWithToken<DealerApplication[]>("/dashboard/dealer-applications"),
        fetchWithToken<ContactLead[]>("/dashboard/contact-leads"),
        fetchWithToken<ProductReviewQueueItem[]>("/dashboard/product-reviews"),
        fetchWithToken<OperationalAlert[]>("/dashboard/operations/alerts"),
        fetchWithToken<EmailOutboxItem[]>("/dashboard/email/outbox"),
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
        operationAlerts,
        emailOutbox,
        auditLogs
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dashboard load failed.");
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

      if (!response.ok) throw new Error("Stored session expired.");

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

      if (!response.ok) throw new Error("Login failed.");

      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      storeToken(payload.data.accessToken);
      await loadDashboard(payload.data.accessToken);
      setMessage("Signed in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
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
    setMessage("Signed out.");
  }

  async function submitJson<T>(
    path: string,
    body: T,
    options: { method?: string; success: string }
  ) {
    setLoading(true);
    setMessage("");

    try {
      await apiFetch(path, {
        method: options.method ?? "POST",
        body: JSON.stringify(body)
      });
      setMessage(options.success);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-login-shell">
          <div>
            <span className="eyebrow">VanStro Dashboard</span>
            <h1>Admin sign in</h1>
            <p>
              Use the seeded super admin account while P1a is being completed.
              API base: <code>{API_BASE_URL}</code>
            </p>
          </div>
          <form className="dashboard-card dashboard-login-card" onSubmit={submitLogin}>
            <label className="field">
              <span>Email</span>
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
              <span>Password</span>
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
            {message ? <p className="dashboard-message">{message}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">P1 Dashboard Shell</span>
          <h1>Catalog, pricing and submissions dashboard</h1>
          <p>
            Signed in as {user.email}. This shell talks to the real Website API
            and keeps the full visual dashboard intentionally thin for now.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="button button-secondary" onClick={() => loadDashboard()} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="button button-primary" onClick={logout} type="button">
            Sign out
          </button>
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Dashboard counts">
        <StatCard label="Products" value={data.products.length} />
        <StatCard label="Categories" value={data.categories.length} />
        <StatCard label="Prices" value={data.pricing.length} />
        <StatCard label="Promotions" value={data.promotions.length} />
        <StatCard label="Users" value={data.users.length} />
        <StatCard label="Dealers" value={data.dealers.length} />
        <StatCard label="Applications" value={data.dealerApplications.length} />
        <StatCard label="Leads" value={data.contactLeads.length} />
        <StatCard label="Reviews" value={data.productReviews.length} />
        <StatCard label="Ops alerts" value={data.operationAlerts.length} />
      </section>

      {message ? <p className="dashboard-message">{message}</p> : null}

      <section className="dashboard-shell-grid">
        <aside className="dashboard-sidebar" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <button
              className={tab.key === activeTab ? "active" : ""}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="dashboard-panel">
          {activeTab === "products" ? (
            <ProductsPanel
              assetInput={assetInput}
              categories={data.categories}
              onAssetChange={setAssetInput}
              onProductChange={setProductInput}
              onSkuChange={setSkuInput}
              onSubmitAsset={() =>
                submitJson(`/dashboard/products/${assetInput.productId}/assets`, assetInput, {
                  success: "Asset created."
                })
              }
              onSubmitProduct={() =>
                submitJson("/dashboard/products", productInput, {
                  success: "Product created."
                })
              }
              onSubmitSku={() =>
                submitJson(`/dashboard/products/${skuInput.productId}/skus`, skuInput, {
                  success: "SKU created."
                })
              }
              productInput={productInput}
              products={data.products}
              skuInput={skuInput}
            />
          ) : null}

          {activeTab === "categories" ? (
            <CategoriesPanel
              categories={data.categories}
              input={categoryInput}
              onChange={setCategoryInput}
              onSubmit={() =>
                submitJson("/dashboard/categories", {
                  ...categoryInput,
                  slug: categoryInput.slug || slugify(categoryInput.name)
                }, {
                  success: "Category created."
                })
              }
            />
          ) : null}

          {activeTab === "pricing" ? (
            <PricingPanel
              input={priceInput}
              onChange={setPriceInput}
              onSubmit={() =>
                submitJson("/dashboard/pricing", {
                  ...priceInput,
                  amountCents: Number(priceInput.amountCents)
                }, {
                  success: "Price created."
                })
              }
              prices={data.pricing}
              products={data.products}
            />
          ) : null}

          {activeTab === "promotions" ? (
            <PromotionsPanel
              input={promotionInput}
              onChange={setPromotionInput}
              onSubmit={() =>
                submitJson("/dashboard/promotions", {
                  ...promotionInput,
                  key: promotionInput.key || slugify(promotionInput.name)
                }, {
                  success: "Promotion created."
                })
              }
              promotions={data.promotions}
            />
          ) : null}

          {activeTab === "users" ? (
            <UsersPanel
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
                  success: "Admin user created."
                })
              }
              roles={data.roles}
              users={data.users}
            />
          ) : null}

          {activeTab === "roles" ? (
            <RolesPanel
              input={roleInput}
              onChange={setRoleInput}
              onSubmit={() =>
                submitJson("/dashboard/roles", roleInput, {
                  success: "Role created."
                })
              }
              roles={data.roles}
            />
          ) : null}

          {activeTab === "dealers" ? <DealersPanel dealers={data.dealers} /> : null}

          {activeTab === "dealerApplications" ? (
            <DealerApplicationsPanel
              applications={data.dealerApplications}
              onAction={submitJson}
            />
          ) : null}

          {activeTab === "contactLeads" ? (
            <ContactLeadsPanel leads={data.contactLeads} onAction={submitJson} />
          ) : null}

          {activeTab === "productReviews" ? (
            <ProductReviewsPanel reviews={data.productReviews} onAction={submitJson} />
          ) : null}

          {activeTab === "operations" ? <OperationsPanel alerts={data.operationAlerts} /> : null}

          {activeTab === "emailOutbox" ? <EmailOutboxPanel items={data.emailOutbox} /> : null}

          {activeTab === "auditLogs" ? <AuditLogsPanel logs={data.auditLogs} /> : null}
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
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
        title="Products"
        copy="Create products, SKUs and basic image assets from the Website API."
      />
      <div className="dashboard-form-grid">
        <QuickForm
          fields={[
            {
              label: "Name",
              value: props.productInput.name,
              onChange: (name) =>
                props.onProductChange({
                  ...props.productInput,
                  name,
                  slug: props.productInput.slug || slugify(name)
                })
            },
            {
              label: "Slug",
              value: props.productInput.slug,
              onChange: (slug) =>
                props.onProductChange({ ...props.productInput, slug })
            }
          ]}
          onSubmit={props.onSubmitProduct}
          title="Create product"
        >
          <label className="field">
            <span>Category</span>
            <select
              value={props.productInput.categoryId}
              onChange={(event) =>
                props.onProductChange({
                  ...props.productInput,
                  categoryId: event.target.value
                })
              }
            >
              <option value="">No category</option>
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
              label: "Product ID",
              value: props.skuInput.productId,
              onChange: (productId) =>
                props.onSkuChange({ ...props.skuInput, productId })
            },
            {
              label: "SKU code",
              value: props.skuInput.skuCode,
              onChange: (skuCode) =>
                props.onSkuChange({ ...props.skuInput, skuCode })
            },
            {
              label: "Name",
              value: props.skuInput.name,
              onChange: (name) => props.onSkuChange({ ...props.skuInput, name })
            }
          ]}
          onSubmit={props.onSubmitSku}
          title="Add SKU"
        />

        <QuickForm
          fields={[
            {
              label: "Product ID",
              value: props.assetInput.productId,
              onChange: (productId) =>
                props.onAssetChange({ ...props.assetInput, productId })
            },
            {
              label: "Asset URL",
              value: props.assetInput.url,
              onChange: (url) => props.onAssetChange({ ...props.assetInput, url })
            },
            {
              label: "Alt text",
              value: props.assetInput.altText,
              onChange: (altText) =>
                props.onAssetChange({ ...props.assetInput, altText })
            }
          ]}
          onSubmit={props.onSubmitAsset}
          title="Add asset"
        />
      </div>

      <Table
        columns={["Name", "Status", "Category", "SKUs"]}
        rows={props.products.map((product) => [
          <span key="name">
            <strong>{product.name}</strong>
            <small>{product.id}</small>
          </span>,
          product.status,
          product.category?.name ?? "-",
          product.skus?.map((sku) => sku.skuCode).join(", ") || "-"
        ])}
      />
    </>
  );
}

function CategoriesPanel(props: {
  categories: Category[];
  input: { name: string; slug: string };
  onChange: (value: { name: string; slug: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <PanelHeader title="Categories" copy="Manage catalog grouping used by storefront rails." />
      <QuickForm
        fields={[
          {
            label: "Name",
            value: props.input.name,
            onChange: (name) =>
              props.onChange({ ...props.input, name, slug: props.input.slug || slugify(name) })
          },
          {
            label: "Slug",
            value: props.input.slug,
            onChange: (slug) => props.onChange({ ...props.input, slug })
          }
        ]}
        onSubmit={props.onSubmit}
        title="Create category"
      />
      <Table
        columns={["Name", "Slug", "Active"]}
        rows={props.categories.map((category) => [
          category.name,
          category.slug,
          category.isActive === false ? "No" : "Yes"
        ])}
      />
    </>
  );
}

function PricingPanel(props: {
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
      <PanelHeader title="Pricing" copy="Create active catalog prices for platform SKUs." />
      <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <h3>Create price</h3>
        <label className="field">
          <span>SKU</span>
          <select
            value={props.input.skuId}
            onChange={(event) =>
              props.onChange({ ...props.input, skuId: event.target.value })
            }
          >
            <option value="">Select SKU</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.skuCode} - {sku.productName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Amount cents</span>
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
          <span>Key</span>
          <input
            value={props.input.key}
            onChange={(event) =>
              props.onChange({ ...props.input, key: event.target.value })
            }
            placeholder="retail:SKU"
          />
        </label>
        <button className="button button-primary" type="submit">
          Create price
        </button>
      </form>
      <Table
        columns={["Key", "SKU", "Amount", "Status"]}
        rows={props.prices.map((price) => [
          price.key,
          price.sku?.skuCode ?? "-",
          formatCents(price.amountCents, price.currency),
          price.status
        ])}
      />
    </>
  );
}

function PromotionsPanel(props: {
  input: { name: string; key: string; status: string };
  onChange: (value: { name: string; key: string; status: string }) => void;
  onSubmit: () => void;
  promotions: Promotion[];
}) {
  return (
    <>
      <PanelHeader title="Promotions" copy="Create campaign shells for storefront pricing labels." />
      <QuickForm
        fields={[
          {
            label: "Name",
            value: props.input.name,
            onChange: (name) =>
              props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
          },
          {
            label: "Key",
            value: props.input.key,
            onChange: (key) => props.onChange({ ...props.input, key })
          }
        ]}
        onSubmit={props.onSubmit}
        title="Create promotion"
      />
      <Table
        columns={["Name", "Key", "Status", "Label"]}
        rows={props.promotions.map((promotion) => [
          promotion.name,
          promotion.key,
          promotion.status,
          promotion.discountLabel ?? "-"
        ])}
      />
    </>
  );
}

function UsersPanel(props: {
  input: { email: string; displayName: string; password: string; roleId: string };
  onChange: (value: { email: string; displayName: string; password: string; roleId: string }) => void;
  onSubmit: () => void;
  roles: Role[];
  users: AdminUser[];
}) {
  return (
    <>
      <PanelHeader title="Users" copy="Create admin users and assign an initial role." />
      <form
        className="dashboard-card dashboard-quick-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <h3>Create admin user</h3>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={props.input.email}
            onChange={(event) => props.onChange({ ...props.input, email: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Display name</span>
          <input
            value={props.input.displayName}
            onChange={(event) =>
              props.onChange({ ...props.input, displayName: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Temporary password</span>
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
          <span>Role</span>
          <select
            value={props.input.roleId}
            onChange={(event) => props.onChange({ ...props.input, roleId: event.target.value })}
          >
            <option value="">No role</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit">
          Create user
        </button>
      </form>
      <Table
        columns={["Email", "Status", "Kind", "Roles"]}
        rows={props.users.map((user) => [
          user.email,
          user.status,
          user.kind,
          user.userRoles?.map((role) => role.role.key).join(", ") || "-"
        ])}
      />
    </>
  );
}

function RolesPanel(props: {
  input: { key: string; name: string };
  onChange: (value: { key: string; name: string }) => void;
  onSubmit: () => void;
  roles: Role[];
}) {
  return (
    <>
      <PanelHeader title="Roles" copy="Create roles. Permission replacement is covered by API smoke." />
      <QuickForm
        fields={[
          {
            label: "Name",
            value: props.input.name,
            onChange: (name) =>
              props.onChange({ ...props.input, name, key: props.input.key || slugify(name) })
          },
          {
            label: "Key",
            value: props.input.key,
            onChange: (key) => props.onChange({ ...props.input, key })
          }
        ]}
        onSubmit={props.onSubmit}
        title="Create role"
      />
      <Table
        columns={["Name", "Key", "Permissions"]}
        rows={props.roles.map((role) => [
          role.name,
          role.key,
          role.rolePermissions?.map((permission) => permission.permission.key).join(", ") || "-"
        ])}
      />
    </>
  );
}

function DealersPanel({ dealers }: { dealers: Dealer[] }) {
  return (
    <>
      <PanelHeader title="Dealers" copy="Read dealer display data and service locations." />
      <Table
        columns={["Name", "Code", "Status", "Locations"]}
        rows={dealers.map((dealer) => [
          dealer.name,
          dealer.code,
          dealer.status,
          dealer.locations
            ?.map((location) => [location.name, location.city, location.province].filter(Boolean).join(", "))
            .join(" / ") || "-"
        ])}
      />
    </>
  );
}

function DealerApplicationsPanel(props: {
  applications: DealerApplication[];
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title="Dealer applications"
        copy="Review dealer program submissions and add internal handling notes."
      />
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: "Application ID" },
            {
              name: "status",
              label: "Status",
              options: ["submitted", "under_review", "approved", "rejected", "archived"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/dealer-applications/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: "Application status updated." }
            )
          }
          title="Update application"
        />
        <ActionForm
          fields={[
            { name: "id", label: "Application ID" },
            { name: "note", label: "Note" }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/dealer-applications/${body.id}/notes`,
              { note: body.note },
              { success: "Application note added." }
            )
          }
          title="Add note"
        />
      </div>
      <Table
        columns={["Company", "Contact", "Market", "Status", "Message"]}
        rows={props.applications.map((application) => [
          <span key="company">
            <strong>{application.companyName}</strong>
            <small>{application.id}</small>
          </span>,
          `${application.contactName} / ${application.email}`,
          `${application.city}, ${application.province}`,
          application.status,
          application.message ?? "-"
        ])}
      />
    </>
  );
}

function ContactLeadsPanel(props: {
  leads: ContactLead[];
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title="Contact leads"
        copy="Route general inquiries from the contact form to an admin user or dealer."
      />
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: "Lead ID" },
            {
              name: "status",
              label: "Status",
              options: ["new", "routed", "closed", "spam"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: "Lead status updated." }
            )
          }
          title="Update lead"
        />
        <ActionForm
          fields={[
            { name: "id", label: "Lead ID" },
            { name: "assignedToUserId", label: "Assigned user ID", required: false },
            { name: "assignedDealerId", label: "Assigned dealer ID", required: false }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/assign`,
              {
                assignedToUserId: body.assignedToUserId,
                assignedDealerId: body.assignedDealerId
              },
              { success: "Lead assigned." }
            )
          }
          title="Assign lead"
        />
        <ActionForm
          fields={[
            { name: "id", label: "Lead ID" },
            { name: "note", label: "Note" }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/contact-leads/${body.id}/notes`,
              { note: body.note },
              { success: "Lead note added." }
            )
          }
          title="Add note"
        />
      </div>
      <Table
        columns={["Name", "Topic", "Status", "Location", "Message"]}
        rows={props.leads.map((lead) => [
          <span key="lead">
            <strong>{lead.name}</strong>
            <small>{lead.id}</small>
            <small>{lead.email}</small>
          </span>,
          lead.topic,
          lead.status,
          [lead.city, lead.preferredDealer].filter(Boolean).join(" / ") || "-",
          lead.message
        ])}
      />
    </>
  );
}

function ProductReviewsPanel(props: {
  reviews: ProductReviewQueueItem[];
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
}) {
  return (
    <>
      <PanelHeader
        title="Product reviews"
        copy="Moderate submitted product reviews before they appear on product detail pages."
      />
      <div className="dashboard-form-grid">
        <ActionForm
          fields={[
            { name: "id", label: "Review ID" },
            {
              name: "status",
              label: "Status",
              options: ["pending", "published", "rejected", "archived"]
            }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/product-reviews/${body.id}/status`,
              { status: body.status },
              { method: "PATCH", success: "Review status updated." }
            )
          }
          title="Moderate review"
        />
        <ActionForm
          fields={[
            { name: "id", label: "Review ID" },
            { name: "note", label: "Note" }
          ]}
          onSubmit={(body) =>
            props.onAction(
              `/dashboard/product-reviews/${body.id}/notes`,
              { note: body.note },
              { success: "Review note added." }
            )
          }
          title="Add note"
        />
      </div>
      <Table
        columns={["Product", "Reviewer", "Rating", "Status", "Review"]}
        rows={props.reviews.map((review) => [
          <span key="product">
            <strong>{review.product?.name ?? "Product"}</strong>
            <small>{review.id}</small>
          </span>,
          `${review.nickname} / ${review.email}`,
          `${review.rating}/5`,
          review.status,
          <span key="review">
            <strong>{review.title ?? "Untitled"}</strong>
            <small>{review.body}</small>
          </span>
        ])}
      />
    </>
  );
}

function EmailOutboxPanel({ items }: { items: EmailOutboxItem[] }) {
  return (
    <>
      <PanelHeader
        title="Email outbox"
        copy="Read pending internal notification emails. Actual SMTP delivery is P3."
      />
      <Table
        columns={["Template", "Recipient", "Status", "Attempts", "Created"]}
        rows={items.map((item) => [
          item.templateKey ?? "-",
          item.toEmail,
          item.status,
          String(item.attemptCount),
          formatDate(item.createdAt)
        ])}
      />
    </>
  );
}

function OperationsPanel({ alerts }: { alerts: OperationalAlert[] }) {
  return (
    <>
      <PanelHeader
        title="Operations"
        copy="Failures require review; waiting records will be retried by the worker automatically."
      />
      {alerts.length === 0 ? <p className="dashboard-empty">No operational alerts.</p> : null}
      <Table
        columns={["Severity", "Alert", "Count", "Queue"]}
        rows={alerts.map((alert) => [
          alert.severity,
          alert.title,
          String(alert.count),
          alert.actionPath
        ])}
      />
    </>
  );
}

function AuditLogsPanel({ logs }: { logs: AuditLogRecord[] }) {
  return (
    <>
      <PanelHeader
        title="Audit logs"
        copy="Read recent Dashboard write activity for traceability."
      />
      <Table
        columns={["Action", "Resource", "Resource ID", "Created"]}
        rows={logs.map((log) => [
          log.action,
          log.resourceType,
          log.resourceId ?? "-",
          formatDate(log.createdAt)
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
              <option value="">Select</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
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
              <td colSpan={columns.length}>No records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
