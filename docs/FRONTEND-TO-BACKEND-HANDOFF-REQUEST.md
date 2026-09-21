---
title: VanStro 前端 → 后端接手任务书（fr-CA 全站）
slug: frontend-to-backend-handoff-request
version: 2.0
updated: 2026-07-26
status: backend-action-required
owner: backend
source-of-truth: 当前工作树 + src/lib/api/api-contract.ts + docs/API-CONTRACT-ALIGNMENT.md
---

# VanStro 前端 → 后端接手任务书

## 0. 先读：当前真实状态

本文件针对当前仓库 `/Users/zhangguannan/Documents/codex/vanstro` 的后端接手工作。前端和 fr-CA 静态站已经完成并部署，但后端生产能力尚未上线。

### 已上线

- 当前静态 release：`/www/wwwroot/vanstro.ca/releases/75fad0bf950a-careers-footer1`
- 回滚 release：`/www/wwwroot/vanstro.ca/releases/75fad0bf950a-frca-full1`
- 线上：`https://vanstro.ca/`、`https://vanstro.ca/fr/`
- 静态包：4,491 个文件，上一轮逐文件完整性 4,491/4,491
- `/fr/`、`/fr/products/`、`/careers/`、`/fr/careers/` 和 sitemap 已线上核验为 HTTP 200

### 尚未达到生产就绪

- `api.vanstro.ca` 当前没有 A/AAAA DNS 解析；
- API、数据库 migration、Worker 没有生产部署证据；
- 登录、收藏、购物车、结账、订单、Dashboard、Contact、Dealer Application、Consent API 的真实 production round-trip 尚不可用；
- 数据库写入型 smoke、支付 provider、ERP、库存并发和 Worker retention 未在生产环境验证；
- 本地工作树仍为 dirty tree，不能把当前未提交状态当作可复现 release。

**后端接手 agent 不得先修改前端来掩盖 API 不可用。必须先完成 API/DNS/DB/Worker 的运行闭环。**

## 1. 不可违反的约定

1. 规范 API 前缀为 `{NEXT_PUBLIC_API_BASE_URL}`，生产目标形如 `https://api.vanstro.ca/api/v1`。
2. HTTP 响应成功使用 `{ data, meta? }`；错误使用 `{ error: string, code: PublicApiErrorCode, fields?: Record<string,string> }`。
3. 保留 `error` 人类可读字符串以兼容旧客户端；`code` 是前端本地化和重试逻辑的机器契约。
4. 时间全部使用 ISO 8601 UTC 字符串。
5. 金额内部使用整数 cents，响应同时提供 `{ amount, currency }`；数据库字段使用 `*Cents`。
6. `CAD` 是当前 storefront 默认币种；税率和 delivery fee 仍是临时业务参数，不能直接视为批准政策。
7. `SKU/UGS`、slug、product ID、MPN、source ID、taxonomy key、图片 URL 和图库顺序不可被 locale 或 overlay 改写。
8. customer auth 使用 `Authorization: Bearer <access_token>`；service account 使用独立 token。
9. CORS 必须允许 `https://vanstro.ca`、`https://www.vanstro.ca` 以及受控本地来源，并允许 `X-Cart-Token`。
10. 所有 public write route 必须有 rate limit、字段长度/格式校验、stable error code 和 raw payload 最小化。
11. 不得把 `localStorage` demo 状态当作 production cart/order source of truth。
12. 不得在生产执行 migration、DNS、Worker、支付或部署操作，除非用户另行明确授权并有回滚方案。

## 2. 当前前端接入点

### 核心契约与客户端

- `src/lib/api/api-contract.ts`：公共类型、`PUBLIC_API_ERROR_CODES`、`API_ENDPOINTS`
- `src/lib/api/dashboard-contract.ts`：Dashboard/CMS 类型和 endpoint 常量
- `src/lib/api/api-client.ts`：统一 fetch、Bearer、`X-Cart-Token`、错误解析、runtime validation
- `src/lib/api/server.ts`：静态构建时 API 读取；失败时当前仍可 fallback 到 mock
- `src/lib/api/form-endpoints.ts`：Contact/Dealer 表单 payload
- `src/lib/i18n/api-error-localization.ts`：EN/fr-CA error code 映射

### 全局运行时

- `src/components/account/CustomerSessionProvider.tsx`：调用 `/auth/me`、`/auth/logout`
- `src/components/storefront/StorefrontProvider.tsx`：cart/favorites/dealer 状态；API 优先，功能 consent 控制 first-party optional storage
- `src/components/checkout/CheckoutClient.tsx`：调用 `POST /checkout/session`，要求 `guestOrderToken`
- `src/components/forms/PublicSubmissionForm.tsx`：Contact/Dealer Application 写入
- `src/components/layout/CustomerSupportWidget.tsx`：Tiledesk consent gate 与 host-side teardown
- `src/components/layout/CookieBar.tsx`、`CookieSettingsClient.tsx`：consent 记录

### locale

- `Locale`：`en-CA | fr-CA | zh-CN`（当前 storefront 公开 scope 为 en-CA/fr-CA）
- API payload 的 Contact/Dealer/Consent 必须保留 `locale`
- CMS/content 读取必须支持 `?locale=en-CA` / `?locale=fr-CA`
- API 错误只返回 stable code + 可安全显示的 message；前端按 locale 翻译

## 3. 后端接手顺序（必须按此顺序）

### P0：可运行基础设施

1. 为 `api.vanstro.ca` 配置 DNS A/AAAA、TLS 和反向代理；
2. 配置 `DATABASE_URL`、`PAYMENT_CALLBACK_SECRET`、`ERP_WEBHOOK_SECRET`；
3. 配置 production `VANSTRO_RUNTIME_MODE=deployment`；占位 secret 必须被拒绝；
4. 启动 API，确认 `/health/live`、`/health/ready`、`/api/v1/health`；
5. 在备份和回滚方案下执行所有 pending Prisma migrations；
6. 启动 Worker，确认数据库连接、日志、心跳和失败重试；
7. 设置 `VANSTRO_CORS_ORIGINS`，实测 `https://vanstro.ca` 的 OPTIONS + credential request。

### P1：公共 storefront API

按 `docs/API-CONTRACT-ALIGNMENT.md` 为 canonical source：

- catalog/categories/products/product detail/assets/commerce/inventory/promotions/dealers；
- `/home/products`、`/home/banners`、`/storefront/home`；
- `/contact/leads`、`/dealer-applications`、product reviews；
- `/privacy/consent-events`；
- 所有错误必须使用 `publicError()` 和 stable code。

### P2：身份、账户和交易

- auth customer register/login/me/refresh/logout；
- account profile/addresses/orders/favorites；
- guest/auth cart 与 `X-Cart-Token`；
- checkout session、inventory reservations、payment session/callback、order detail/status；
- 订单成功后建立 ERP job，不得重复建 order 或 ERP job；
- Payment callback 必须签名验证且幂等。

### P3：Worker 与集成

- 过期 inventory reservation 回收；
- pending/expired payment session 处理；
- 24 calendar month consent retention；
- SMTP outbox、suppression、retry；
- ERP order push、HMAC webhook、幂等键 `(erpSystem,eventType,externalId)`；
- 失败任务状态、attempt、lock TTL、告警和 retry。

### P4：Dashboard/CMS

先实现前端已有的 operation API，再做内容 CMS：

- Dashboard auth/permissions/roles/users；
- products/categories/pricing/promotions/sku mappings/assets；
- dealer/dealer locations/service areas/ERP links；
- dealer applications/contact leads/product reviews；
- orders/payment sessions/ERP jobs/email outbox/audit logs/operations alerts；
- navigation/home-page/catalog/footer/legal-pages/articles；
- module readiness/config 仅作为 resource endpoint 的薄映射，不要同时维护两套真源。

## 4. 公共 API 契约

### Auth

| Method | Path | 成功 | 关键失败 |
|---|---|---|---|
| POST | `/auth/customer/register` | 201 `{ data: { accessToken, tokenType, expiresAt, user } }` | `AUTH_INVALID_INPUT`, `AUTH_PASSWORD_TOO_SHORT`, `AUTH_ACCOUNT_EXISTS` |
| POST | `/auth/login` | 200 session | `AUTH_INVALID_INPUT`, `AUTH_INVALID_CREDENTIALS` |
| GET | `/auth/me` | 200 `{ data: { user } }` | `AUTH_REQUIRED` |
| POST | `/auth/refresh` | 200 rotated session | `AUTH_REQUIRED` |
| POST | `/auth/logout` | 200 `{ data: { ok:true } }`，幂等 | 无需 token 也应安全返回 |
| POST | `/auth/logout-all` | 200 `{ data: { ok:true } }` | `AUTH_REQUIRED` |

注册密码最低 12 字符。customer 与 admin 不得共用 public registration。

### Catalog

| Method | Path | 前端用途 | 约束 |
|---|---|---|---|
| GET | `/categories` | 分类/筛选 | active、sortOrder、stable slug |
| GET | `/products?category=&q=&limit=&offset=` | products | `limit/offset` 为有限非负整数，limit 上限 100，返回 `meta.total` |
| GET | `/products/:identifier` | PDP | identifier 可为 product ID 或 slug |
| GET | `/products/:identifier/assets` | gallery | `sortOrder` 稳定，altText 可 locale 化 |
| GET | `/products/:identifier/commerce` | price/promotion | 当前价、比较价、币种、有效期 |
| POST | `/products/commerce` | 批量价格 | 非空 string productIds |
| GET | `/products/:identifier/inventory` | PDP availability | 不泄漏不必要内部信息 |
| POST | `/products/inventory` | 批量 availability | 最多 100 identifiers |
| GET | `/promotions/active` | promotion | 按当前 UTC 时间过滤 |
| GET | `/dealers` | dealer selector/map | location/serviceAreas/pickup/delivery |
| GET | `/home/products` | 首页八个产品 | BFF，仍返回 ProductSummary |
| GET | `/home/banners` | 首页 banner | 必须按 locale 返回 |
| GET | `/storefront/home` | 可选聚合 | 不包含业务写入 |

产品 response 必须保留：`id`, `slug`, `sku`, `manufacturerPartNumber`, category/subcategory keys, price, commerce, availability, images, finishOptions, packageQuantity、specifications。

### Public submissions

| Method | Path | 成功 | 必须校验 |
|---|---|---|---|
| POST | `/contact/leads` | 201 `{ data: { leadId, status } }` | email、topic allowlist、长度、locale、sourcePath |
| POST | `/dealer-applications` | 201 `{ data: { applicationId, status } }` | email、URL、capabilities、长度、locale、acknowledgement |
| POST | `/products/:identifier/reviews` | 201 review status | rating 1–5 integer、email、长度、terms |
| GET | `/products/:identifier/reviews` | published reviews | 只返回 published |
| POST | `/privacy/consent-events` | 201 `{ data: { id, createdAt } }` | 仅 canonical preference fields、source allowlist、anonymousId 长度 |

`rawPayload` 只允许非重复 provenance/locale metadata；不得保存额外姓名、邮箱、电话、地址、token 或 credentials。

### Commerce

| Method | Path | 说明 |
|---|---|---|
| GET | `/cart` | Bearer 或 `X-Cart-Token` |
| POST | `/cart/items` | `{ productId, skuCode?, quantity }` |
| PATCH | `/cart/items/:itemId` | quantity 1–999 |
| DELETE | `/cart/items/:itemId` | 当前 cart 范围 |
| DELETE | `/cart` | 清空当前 cart |
| POST | `/checkout/session` | 创建 pending payment session + active reservations，不建 order |
| GET | `/payments/sessions/:id?token=` | owner/guest token 才可读取 |
| POST | `/payments/callback` | `x-payment-signature`，paid callback 幂等建 order |
| GET | `/orders/:id` | bearer owner 或 guest token |
| GET | `/orders/:id/status` | bearer owner 或 guest token |
| POST | `/inventory/reservations` | explicit reservation，返回 reservation token |
| DELETE | `/inventory/reservations/:id` | `x-reservation-token` 必须匹配 |

`POST /checkout/session` 当前输入：

```json
{
  "firstName": "Guan",
  "lastName": "Nan",
  "email": "buyer@example.com",
  "phone": "+1 204 555 0100",
  "fulfillment": "pickup",
  "paymentMethod": "pos",
  "notes": "Call before pickup",
  "dealerLocationId": "location-id"
}
```

成功：

```json
{
  "data": {
    "id": "payment-session-id",
    "status": "pending",
    "total": { "amount": 317.10, "currency": "CAD" },
    "expiresAt": "2026-07-26T18:30:00.000Z",
    "guestOrderToken": "opaque-token"
  },
  "meta": { "cartToken": "opaque-cart-token" }
}
```

当前 5% tax 与 delivery `1500` cents 是临时业务边界，必须由业务确认后才可固化。

### Runtime error codes

当前 `PUBLIC_API_ERROR_CODES` 包括：

```text
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_EXISTS
AUTH_PASSWORD_TOO_SHORT
AUTH_INVALID_INPUT
AUTH_REQUIRED
CATALOG_INVALID
INVENTORY_REFRESHING
INVENTORY_INSUFFICIENT
INVENTORY_NO_DEALER
CART_EMPTY
CART_ITEM_NOT_FOUND
CHECKOUT_INVALID
CHECKOUT_FULFILLMENT_UNAVAILABLE
PAYMENT_SESSION_NOT_FOUND
PAYMENT_SESSION_DENIED
COMMERCE_INVALID
COMMERCE_NOT_FOUND
COMMERCE_ACCESS_DENIED
RATE_LIMITED
CONTACT_INVALID
DEALER_APPLICATION_INVALID
SUBMISSION_INVALID
PRIVACY_CONSENT_INVALID
PRIVACY_CONSENT_FAILED
```

新增错误码必须同时：

1. 更新 `src/lib/api/api-contract.ts`；
2. 更新 `src/lib/i18n/api-error-localization.ts` 的 en-CA/fr-CA 文案；
3. 增加 API 或 verifier 测试；
4. 保留稳定 code，不要让前端依赖英文 message 反向匹配。

## 5. Dashboard 当前接口面

已有 route source：`apps/api/src/routes/dashboard.ts`、`apps/api/src/dashboard/system.ts`。

### 已有/优先验证

- `GET/POST/PATCH /dashboard/users[/:id]`
- `PATCH /dashboard/users/:id/status`
- `POST/DELETE /dashboard/users/:id/roles[/:roleId]`
- `GET/POST/PATCH /dashboard/roles[/:id]`
- `GET /dashboard/permissions`
- `PUT /dashboard/roles/:id/permissions`
- `GET/POST/PATCH /dashboard/products[/:id]`
- `POST /dashboard/products/:id/skus`
- `PATCH /dashboard/skus/:id`
- `POST /dashboard/products/:id/assets`
- `GET/POST/PATCH /dashboard/categories[/:id]`
- `GET/POST/PATCH /dashboard/pricing[/:id]`
- `GET/POST/PATCH /dashboard/promotions[/:id]`
- `GET/POST/PATCH /dashboard/sku-mappings[/:id]`
- `GET/PATCH /dashboard/dealers[/:id]`
- `POST /dashboard/dealer-locations/:id/service-areas`
- `POST /dashboard/dealers/:id/erp-links`
- dealer applications/contact leads/product reviews 的 list/detail/status/assign/notes
- `GET /dashboard/orders[/:id]`
- `GET /dashboard/payment-sessions`
- `GET/POST /dashboard/erp-sync-jobs[/:id]` + retry
- `GET /dashboard/email/outbox` + retry
- `GET /dashboard/audit-logs`
- `GET /dashboard/operations/alerts`
- MCP service accounts/tokens/invocations

所有 Dashboard route 都需要 permission ceiling 和 audit log；不得把 raw token 写入日志或返回超过一次。

### 尚需开发的内容 CMS API

保持 Pattern A 为单一真源：

- `PUT /dashboard/navigation`
- `PUT /dashboard/home-page`
- `PUT /dashboard/footer`
- `PUT /dashboard/legal-pages/:slug`
- `GET/POST/PATCH /dashboard/articles`
- `GET/PUT /dashboard/storefront/config`
- 可选：`GET/PUT /dashboard/modules/:moduleKey` 作为薄适配层

CMS 内容至少按 `locale` 分开存储；发布状态为 `draft | published | archived`；静态站构建时读取 published 内容。

## 6. 数据库与迁移

当前 schema：`packages/db/prisma/schema.prisma`。

待生产环境逐一验证的迁移：

- `20260725090000_checkout_contact_payment`
- `20260725120000_privacy_consent_retention_index`
- `20260725130000_privacy_consent_action`
- `20260725143000_contact_lead_locale`

迁移前必须：备份、`prisma migrate status`、检查既有行默认值和非空列兼容、制定 rollback/restore 方案。不要在生产执行 `migrate dev`。

重点模型：`User`、`CustomerProfile`、`CustomerAddress`、`Cart`、`CartItem`、`Favorite`、`PaymentSession`、`Order`、`OrderItem`、`OrderStatusEvent`、`InventorySnapshot`、`InventoryReservation`、`PrivacyConsentEvent`、`ContactLead`、`DealerApplication`、`ProductReview`、`ErpSyncJob`、`EmailOutbox`。

## 7. Worker 交接

源码：`apps/worker/src/index.ts`。

职责：

- 释放过期 inventory reservations；
- 将 pending payment sessions 标记 expired；
- 删除超过 24 calendar months 的 consent records；
- SMTP outbox 发送、抑制、锁租约、重试；
- ERP order push、幂等、重试和失败状态；
- 输出 backlog/health 日志。

命令：

```bash
pnpm worker:once
pnpm worker:dev
```

生产需要单独进程管理、日志、告警、锁 TTL、退出信号和数据库连接池策略。`worker:once` 只能用于受控 smoke，不等于常驻部署。

## 8. 环境变量与部署验收

API 必需/核心变量：

```text
VANSTRO_RUNTIME_MODE=deployment
DATABASE_URL=...
API_HOST=0.0.0.0
API_PORT=4000
VANSTRO_CORS_ORIGINS=https://vanstro.ca,https://www.vanstro.ca
PAYMENT_CALLBACK_SECRET=non-placeholder-32+ chars
ERP_WEBHOOK_SECRET=non-placeholder-32+ chars
INVENTORY_SNAPSHOT_TTL_MS=...
```

Worker/集成变量：

```text
WORKER_POLL_INTERVAL_MS=...
SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM
EMAIL_LOCK_TTL_MS EMAIL_MAX_ATTEMPTS
ERP_API_BASE_URL ERP_SERVICE_TOKEN ERP_LOCK_TTL_MS ERP_MAX_ATTEMPTS
```

发布顺序：

1. 建立 DNS/TLS/API reverse proxy；
2. 部署 API/Worker 到新版本目录；
3. 运行 `prisma migrate deploy`；
4. `/health/live` 必须 200；`/health/ready` 只有 DB/迁移正常才 200；
5. CORS preflight + `X-Cart-Token`；
6. 用非生产测试账户完成 register/login/me/logout；
7. guest cart → checkout session → signed payment callback → order → ERP job；
8. consent write、retention once、Worker backlog；
9. public contact/dealer/review + dashboard read；
10. 失败时按 release/DB/Worker 回滚手册处理。

## 9. 验收清单

### API

```bash
pnpm typecheck
pnpm test:api
pnpm api:smoke
```

### 数据库/Worker

```bash
pnpm --filter @vanstro/db exec prisma validate --schema prisma/schema.prisma
pnpm --filter @vanstro/db exec prisma migrate status --schema prisma/schema.prisma
pnpm worker:once
```

### 前端现有门禁

```bash
NEXT_PUBLIC_SITE_URL=https://vanstro.ca pnpm run qa:ci
```

### 必须补充的 production-like 证据

- `/health/live`、`/health/ready`；
- OPTIONS `X-Cart-Token`；
- customer auth round-trip；
- cart token continuity；
- checkout required fields/stock/dealer capability；
- signed callback idempotency；
- guest order token access control；
- consent canonical storage/action/retention；
- contact/dealer/review validation and rawPayload minimization；
- ERP HMAC/allowlist/idempotency；
- SMTP/ERP retry and lock reclaim；
- backups and migration rollback drill。

## 10. 当前阻塞与业务决策

必须由业务/法律/基础设施 owner 确认：

1. tax 规则，不要默认 5%；
2. delivery fee/zone，不要默认 CAD 15；
3. 支付 provider（当前 `pos`/`cash` 只是现有前端选择）；
4. dealer postal resolver、pickup/delivery 能力和 service area；
5. `204-505-2288` vs `204-221-2288`；
6. `856 Century St` vs `856 Century Street`；
7. Qingdao Wanshituo 的法律/处理角色；
8. applicant retention 和 Privacy/Québec Law 25；
9. Tiledesk 跨域 storage、retention、撤回机制；
10. ERP `/orders` response 和 webhook status contract。

## 11. 交接完成定义

后端 agent 只有在以下条件全部满足后才可标记 backend ready：

- API DNS/TLS/CORS 可用；
- migrations 在目标 DB 成功应用并有记录；
- Worker 常驻运行并有 retention/queue 证据；
- API tests、smoke、health、auth、cart、checkout、payment、order、ERP、consent 均有 production-like 证据；
- clean checkout 能重跑 `qa:ci`；
- 前端无须改变路由或绕过稳定 error code；
- 所有业务与法律阻塞项有书面决定；
- 发布有 immutable release、rollback、备份和监控。
