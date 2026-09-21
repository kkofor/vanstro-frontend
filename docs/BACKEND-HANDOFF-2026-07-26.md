---
title: VanStro Backend Handoff
date: 2026-07-26
commit: 3eb35c5340dd68a6b0a5aee3fb5eb2ae522087f9
branch: claude/dealer-neutral-copy-sync-20260721
repo: /Users/zhangguannan/Documents/codex/vanstro
status: local-verified — production deploy NOT authorized by default
audience: next backend / full-stack agent
---

# VanStro Backend Handoff (2026-07-26)

给下一位后端 agent 的完整接手说明。先读本文，再读 [`docs/backend/README.md`](./backend/README.md) 与 [`docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md`](./SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md)。

## 0. 一句话现状

本地 monorepo 已具备可跑的 **API + Worker + Postgres + Dashboard/Storefront 联调闭环**：结账→支付→订单时间线→CRM/邮件→ERP catalog sync→运营 PV。  
门禁在 commit `3eb35c5` 时全绿：`pnpm typecheck`、`pnpm test:api`（70）、`pnpm api:smoke`。  
**生产 DNS / migrate deploy / Worker 常驻 / 真实 Moneris / 真实 Canada Post Key 尚未由本会话授权执行。**

## 1. 不可违反的约束

1. 未经用户明确授权：**禁止**生产 DNS/TLS、`prisma migrate deploy` 到生产、Worker 常驻部署、支付切 prod、`git push`、force push、destructive git。
2. API 前缀：`/api/v1`（健康检查另有 `/health/*`）。
3. 成功响应：`{ data, meta? }`；错误：`{ error, code, fields? }`（`code` 为机器契约）。
4. 金额：DB `*Cents`；JSON 同时给 `{ amount, currency }`。
5. 时间：ISO 8601 UTC。
6. 客户 auth：`Authorization: Bearer`；购物车访客：`X-Cart-Token`；服务账号：Dashboard 签发的 service token。
7. Public write 必须有 rate limit + 字段校验 + stable `code`。
8. SMTP 密码、Moneris token、Canada Post key、ERP token **不得写入 git**；只改 `.env` / Dashboard UI。
9. Analytics 只在 `consentAnalytics: true` 时入库。
10. `PaymentSessionStatus` **没有** `cancelled`；支付初始化失败用 `failed`。
11. `publicError` **不接受** `503` 作为参数路径之一时用 `502`（见 `public-errors.ts`）。
12. Dashboard mark-paid 必须在 handler 内 `await import("../app.js")`，避免与 `createApp` 循环依赖。

## 2. 仓库地图

| 路径 | 职责 |
| --- | --- |
| `apps/api` | Hono API（`createApp` 挂载全部路由） |
| `apps/worker` | 邮件出站、ERP outbound、过期预留释放、定时 catalog sync |
| `packages/db` | Prisma schema / migrations / seed / permissions |
| `src/` | Next.js storefront + `/dashboard`（同仓联调） |
| `src/lib/api/api-contract.ts` | 公共契约真源 |
| `docs/API-CONTRACT-ALIGNMENT.md` | 路径对齐表 |
| `.env.example` | 环境变量模板 |

### API 模块入口（`apps/api/src`）

```text
app.ts                 # createApp、CORS、health、挂载
routes/                # auth, commerce, catalog, cms, submissions, privacy, analytics, erp-integration, ...
dashboard/             # access ACL + catalog/cms/crm/system/support/dealers/...
crm/service.ts         # Website CRM dual-write
payments/              # manual HMAC + Moneris Checkout
integrations/
  canada-post/         # AddressComplete proxy
  erp-catalog-sync/    # ERP → local catalog merge
  erp-product/         # upstream product/color APIs
  erp-sync/            # inventory helpers
middleware/            # rate-limit, request-id
smoke.ts               # 端到端 smoke（依赖本地 DB + seed）
```

### 关键迁移（近期）

| Migration | 内容 |
| --- | --- |
| `20260728120000_website_crm` | CRM contacts / events |
| `20260729120000_checkout_shipping_address` | PaymentSession/Order 配送地址字段 |
| `20260729180000_ops_pageviews_catalog_sync` | `PageViewEvent`、`CatalogSyncRun`、EmailProviderAccount 等 ops 表 |

## 3. 已完成的后端能力（按域）

### 3.1 Auth / Account

- Customer register / login / me / logout
- 注册成功入队 `welcome` 邮件模板
- Account：profile、addresses CRUD、orders、favorites
- Guest order：`token` / `guestOrderToken` 查询订单

### 3.2 Commerce

- Cart（Bearer 或 `X-Cart-Token`）
- Checkout `POST /checkout/session`：pickup/delivery；delivery **必须**完整加拿大地址字段
- 省税率：`tax_rates` 表；配送固定费：`DELIVERY_FLAT_FEE_CENTS`（默认 1500）
- Inventory reservation：checkout 增加 `quantityReserved`；支付回调消耗预留并扣减库存
- Payment methods：`card`（Moneris）、`pos`、`cash`（manual HMAC）
- `POST /payments/callback`、`POST /payments/simulate`（仅 `ENABLE_PAYMENT_SIMULATION=true`）
- `GET /orders/:id`、`GET /orders/:id/status`：返回 `statusEvents` + `shipment`（从 shipment 源事件提取）
- `GET /address/autocomplete`：Canada Post AddressComplete 代理（需 `CANADA_POST_API_KEY`）

### 3.3 Website CRM

- `apps/api/src/crm/service.ts`：registration / guest checkout / cart / favorites / paid order / **contact_form & dealer_application**
- Dashboard：`/dashboard/crm/contacts*`（read/update/notes/promote-to-erp）
- Promote → `ErpSyncJob(type: customer_sync)`

### 3.4 Dashboard ops（本轮新增重点）

| Endpoint | Permission | 说明 |
| --- | --- | --- |
| `POST /dashboard/payment-sessions/:id/mark-paid` | `orders.update` | 仅 pending 且非 card；内部 HMAC 调 `/payments/callback` |
| `GET/PUT /dashboard/email/provider` | `email.provider.*` | SMTP 存 `EmailProviderAccount`（密码脱敏返回） |
| `POST /dashboard/email/provider/test` | `email.provider.write` | 入队 welcome 测试信 |
| `GET /dashboard/analytics/summary` | `analytics.read` | 7 日 PV/UV、top paths、funnel |
| `GET /dashboard/erp-webhook-events` | `erp.webhooks.read` | webhook 日志 |
| Email templates CRUD + versions | `email.templates.*` | 已存在；UI 已可编辑发布 |
| `POST /dashboard/catalog/sync-from-erp` | `products.write` | 写 `CatalogSyncRun` |

### 3.5 Analytics

- `POST /analytics/pageviews` — 必须 `consentAnalytics: true`；有 rate limit
- Storefront：`PageViewTracker`（cookie analytics consent 门控）

### 3.6 ERP

- Outbound worker：`order_create`、`customer_sync`、`inventory_release`
- Inbound：order-status / shipment webhooks（shipment 成功后入队 `shipment_notification` / `order_delivered`）
- Catalog pull：`erp-catalog-sync` + worker 定时（`CATALOG_SYNC_INTERVAL_MS`，默认 6h）经 service token 调 Dashboard sync API
- Upstream product/color proxy：`/integrations/erp/*`、`GET /products/:id/erp-colors`

### 3.7 Email Worker

- 优先读 Dashboard `EmailProviderAccount(key=default_smtp)`；否则回退 env SMTP
- **部署模式不再强制启动时必须有 SMTP**（可仅靠 Dashboard 配置）
- Seed 模板含：`welcome`、`shipment_notification`、`order_delivered` 等

### 3.8 CMS / Content / Support

- Navigation / home-page / footer / legal / articles / modules
- Support handoffs public + dashboard queue
- Contact / dealer-application / reviews submissions

## 4. 本地启动与门禁

```bash
cd /Users/zhangguannan/Documents/codex/vanstro
cp .env.example .env   # 或沿用现有 .env；注意 DATABASE_URL 端口与 docker 一致
pnpm install
pnpm db:generate
pnpm db:migrate        # 非交互用: prisma migrate deploy
pnpm db:seed           # 新权限需 re-seed；SUPER_ADMIN_* 必填

# 三端
pnpm api:dev           # :4000
pnpm worker:dev
pnpm dev               # :3000 Next

# 门禁（合并前必跑）
pnpm typecheck
pnpm test:api
pnpm api:smoke
# 可选
pnpm worker:once
pnpm qa:backend        # 若脚本存在：typecheck + test:api + smoke
```

Dashboard 登录：seed 的 `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`。  
新权限（`email.provider.*`、`analytics.read`、`erp.webhooks.read`）在 `packages/db/src/permissions.ts`；**已有库需 re-seed 或给超级管理员角色补权限**，否则 UI Tab 不可见。

## 5. 关键环境变量

见 `.env.example`。接手时特别注意：

| Var | 用途 |
| --- | --- |
| `VANSTRO_RUNTIME_MODE` | `development` / `deployment` |
| `PAYMENT_CALLBACK_SECRET` | manual / mark-paid / simulate HMAC |
| `ENABLE_PAYMENT_SIMULATION` | 开放 `/payments/simulate` |
| `CANADA_POST_API_KEY` | 地址联想；空则前台走手工地址 |
| `MONERIS_*` / `NEXT_PUBLIC_MONERIS_*` | card 路径；缺省时 card 不可用 |
| `ERP_*` | outbound + product API |
| `VANSTRO_API_BASE_URL` + `VANSTRO_SERVICE_ACCOUNT_TOKEN` | Worker → API catalog sync |
| `CATALOG_SYNC_INTERVAL_MS` | 默认 `21600000`（6h） |
| `SMTP_*` | Worker 回退；Dashboard SMTP 优先 |
| `DELIVERY_FLAT_FEE_CENTS` | 配送费（smoke 会读） |

凭据清单：

- [`docs/reports/moneris-credentials-checklist.md`](./reports/moneris-credentials-checklist.md)
- [`docs/reports/canada-post-credentials-checklist.md`](./reports/canada-post-credentials-checklist.md)

## 6. 权限 ACL 真源

- 列表：`packages/db/src/permissions.ts` → `INITIAL_PERMISSIONS`
- 路由绑定：`apps/api/src/dashboard/access.ts`
- Dashboard Tab 可见性：`src/lib/dashboard/tab-permissions.ts`

新增权限后务必：更新三处 + seed + 文档。

## 7. 已知坑 / 设计决策

1. **mark-paid 循环 import**：只在 handler 内动态 `import("../app.js")`。
2. **Worker 无 `@vanstro/api` 依赖**：catalog sync 走 HTTP，不要在 worker 里直接 import API 路由。
3. **表单 CRM 与 mock 测试**：`submissions` 测试 stub 必须 mock `crmContact` + `crmContactEvent`（见 `submissions.test.ts`）。
4. **Smoke delivery**：必须带 `shippingAddressLine1/city/province/postalCode`。
5. **Prisma advisory lock**：若 `migrate` 超时，检查残留 `schema-engine` 进程后再 `migrate deploy`。
6. **`.env` 端口**：`.env.example` 默认 `15432`；本机实际 `.env` 可能是 `5432`——以本机 docker/postgres 为准。
7. **Inventory 文档可能过时**：`docs/DEVELOPING.md` 曾写「只减 reserved」；以当前 payment callback 实现为准（消耗 reservation 并更新 on-hand/reserved）。改文档前先读代码。

## 8. 明确未做 / 下一位优先建议

按优先级（建议，非授权）：

| Priority | Item |
| --- | --- |
| P0 | 生产 API DNS + TLS + migrate deploy + Worker + 真实 SMTP（需用户授权） |
| P0 | Moneris QA 凭据到位后跑通 card e2e |
| P1 | Canada Post key 到位后验收 autocomplete |
| P1 | ERP inbound inventory quantity webhook（上游有 API 后再做） |
| P1 | `POST /integrations/erp/webhooks/customer-update` |
| P2 | Checkout 促销折扣引擎 |
| P2 | Webhook replay / timestamp 硬化（见 erp-adapter-contract 若存在） |
| P2 | Dashboard ERP webhook 事件 UI（API 已有） |
| P3 | OpenAPI 重新生成并与契约 diff |

## 9. 建议接手后的前 30 分钟

1. `git log -1` 确认在 `3eb35c5` 或其后；`git status` 忽略无关 goal-loop/handoff 脏文件。
2. 起 Postgres → `db:migrate` → `db:seed` → `api:dev` → `worker:dev`。
3. 跑 `pnpm typecheck && pnpm test:api && pnpm api:smoke`。
4. 浏览器：`/dashboard` 登录 → Payment sessions / Email outbox / Operations / CRM。
5. Storefront：加购 → checkout（pickup cash 或 pos）→ mark-paid 或 simulate → `/orders/:id` 看时间线。
6. 读 `docs/API-CONTRACT-ALIGNMENT.md` 与 `src/lib/api/api-contract.ts`，改 API 时同步更新二者。

## 10. 相关文档索引

| Doc | 用途 |
| --- | --- |
| [`docs/backend/README.md`](./backend/README.md) | 后端快速 README |
| [`docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md`](./SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md) | 本会话交付的全部项目清单 |
| [`docs/DEVELOPING.md`](./DEVELOPING.md) | 本地开发步骤 |
| [`docs/API-CONTRACT-ALIGNMENT.md`](./API-CONTRACT-ALIGNMENT.md) | 契约对齐 |
| [`docs/reports/dashboard-erp-crm-handoff-2026-07-26.md`](./reports/dashboard-erp-crm-handoff-2026-07-26.md) | ERP/CRM 边界 |
| [`docs/FRONTEND-TO-BACKEND-HANDOFF-REQUEST.md`](./FRONTEND-TO-BACKEND-HANDOFF-REQUEST.md) | 早期前端→后端任务书（生产状态可能过时，以本文件为准） |
| [`docs/FRONTEND-HANDOFF-2026-07-26.md`](./FRONTEND-HANDOFF-2026-07-26.md) | 前端侧 handoff |

---

**交接结论：** 后端功能与联调面已在本地闭环；下一位 agent 默认任务是**维护门禁、补生产就绪与真实凭据路径**，而不是从零实现 checkout/CRM/ops。任何生产动作必须先获得用户书面授权。
