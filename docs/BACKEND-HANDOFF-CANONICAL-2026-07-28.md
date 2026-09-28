# VanStro Backend Canonical Handoff

> 这是当前后台系统的 canonical 接手文档。优先级高于旧版 `docs/BACKEND-HANDOFF-2026-07-26.md`、早期 production runbook，以及 `tasks/handoff.md` 中描述旧阶段的段落。
>
> 文档日期：2026-07-28
> 代码仓库：`/Users/zhangguannan/Documents/codex/vanstro`
> 当前分支：`claude/dealer-neutral-copy-sync-20260721`
> 起始 HEAD：`85363ef36f8e428e57b822da167e9f6656dd268b`
> 重要：本文档编写时工作树不是干净 checkout；当时约有 62 个 modified、55 个 untracked、1 个 stash。任何 reset、clean、checkout、stash 操作或批量 add 前必须先获得授权并制作保护性备份。

---

## 1. 接手者先读什么

按以下顺序阅读：

1. 本文件：`docs/BACKEND-HANDOFF-CANONICAL-2026-07-28.md`
2. `tasks/handoff.md`：跨会话状态，包含最新生产 E2E 摘要
3. `tasks/checkpoints/2026-07-27-production-customer-chain-e2e.md`：生产客户链路证据
4. `tasks/checkpoints/2026-07-27-fullstack5-reviewed-content-payment-deployed.md`：当前前端 release 证据
5. `SPEC.md`：产品和后端功能规格
6. `DECISIONS.md`：架构决策记录
7. `docs/PRODUCTION-RELEASE-CHECKLIST.md`：发布门禁
8. `docs/PRODUCTION-INFRASTRUCTURE-RUNBOOK-2026-07-27.md`：基础设施原则；其中部分内容是历史版本，若与本文件冲突，以本文件和服务器只读事实为准
9. `docs/BACKEND-HANDOFF-2026-07-26.md`：历史后端地图，仅用于补充背景

---

## 2. 一句话系统定义

VanStro 是一个加拿大建材电商平台：

```text
Next.js 静态 storefront + Dashboard
              |
       same-origin /api/v1
              |
       Hono API 单体服务
              |
     PostgreSQL 16 + Prisma
              |
   独立 DB-polling Worker
              |
 SMTP / Moneris MCO / ERP（ERP 当前断开）
```

当前 backend 不是微服务集群，也没有 Redis 或独立消息队列。业务事务、幂等、outbox、ERP jobs、限流桶和审计均依赖 PostgreSQL。

---

## 3. 当前生产事实（2026-07-27/28）

### 3.1 生产访问地址

- 网站：`https://vanstro.ca/`
- 法语网站：`https://vanstro.ca/fr/`
- 同源 API：`https://vanstro.ca/api/v1`
- API readiness：`https://vanstro.ca/health/ready`
- API liveness：`https://vanstro.ca/health/live`
- `api.vanstro.ca` 没有作为当前交易链路依赖；不要因为旧 runbook 中提到它而改变当前 DNS。

### 3.2 当前前端 release

```text
活动 release：
/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack8-dashboard

明确保留的回滚点：
/www/wwwroot/vanstro.ca/releases/75fad0bf950a-careers-footer1
```

前端 release 是 immutable directory。不得覆盖活动目录。切换前必须创建新目录、校验文件完整性、先 `nginx -t`，并保留旧 release。

### 3.3 生产后台运行态

- OS：Ubuntu 22.04 LTS
- CPU：16
- 内存：约 15 GiB
- 根分区：约 117 GiB，总使用约 37%
- Docker Server：29.6.2
- Docker Compose：v5.3.1
- API：healthy，绑定 `127.0.0.1:4000`
- PostgreSQL 16：healthy，绑定 `127.0.0.1:15434`
- Worker：running，无公网端口
- Migration runner：one-shot，最近运行成功
- 当前数据库：41/41 migrations applied，failed/incomplete 为 0
- 当前 active products：140
- 当前 active products 下 inventory snapshots：300
- 当前所有 active-product snapshots：`quantityOnHand=10`
- 当前总 `quantityReserved=0`
- 当前 active reservations：0
- ERP：暂不接入
- 当前生产：`INVENTORY_SOURCE_MODE=manual`
- 当前生产 payment simulation：关闭，公网 `/api/v1/payments/simulate` 返回 404
- 当前 Moneris：production MCO 已配置，preload/ticket 已验证；未执行真实银行卡扣款
- 当前 SMTP：生产邮件 E2E 已验证

### 3.4 生产数据规模快照

最近一次非敏感统计：

| 数据 | 数量/状态 |
|---|---:|
| users | 3 |
| active products | 140 |
| all products | 143 |
| archived products | 3 |
| platform SKUs | 301 |
| ERP mappings | 303 |
| orders | 1（QA 订单，已 cancelled） |
| payment sessions | 5，当前均为 expired/refunded 状态 |
| CRM contacts | 4 |
| email outbox | 6，均 sent |
| ERP jobs | 10：7 个历史 pending，3 个 E2E job cancelled |
| migrations | 41 applied / 0 failed |

生产数据库中保留了可追溯的 E2E account/order/event/audit 记录，不应把它们当作真实客户订单。

---

## 4. 技术栈

### Runtime / language

- Node.js 22（Docker 基于 `node:22-bookworm-slim`）
- TypeScript 6
- pnpm 11.13.0
- ESM modules

### Backend

- Hono 4
- `@hono/node-server`
- PostgreSQL 16
- Prisma 6.19
- Nodemailer 9
- PBKDF2-SHA256 密码哈希，默认 310,000 iterations

### Frontend / Dashboard

- Next.js 16.2.9
- React 19
- 静态 export 产物由 nginx 提供
- `/dashboard` 是同一 Next.js 项目中的运营界面

### Worker

- 独立 Node process
- 轮询 PostgreSQL job/outbox 表
- 默认每 30 秒一个 tick
- 不直接 import `@vanstro/api` 进行 ERP catalog sync；通过 HTTP + service account token 调 API

### 没有使用的基础设施

- 没有 Redis 作为生产限流真源；当前 deployment rate limit 使用 PostgreSQL `rate_limit_buckets`
- 没有 Kafka/RabbitMQ/SQS
- 没有独立支付服务
- 没有自动 Moneris refund worker
- ERP 当前没有真实 endpoint/token 配置

---

## 5. 仓库地图

```text
/Users/zhangguannan/Documents/codex/vanstro/
├── apps/api/                         Hono API
│   ├── src/index.ts                  API 进程入口
│   ├── src/app.ts                    createApp、middleware、路由装配、health
│   ├── src/config.ts                 API runtime config
│   ├── src/routes/                   public/auth/commerce/CMS/ERP/dashboard routes
│   ├── src/dashboard/                ACL、系统、catalog、CMS、CRM、dealer、support
│   ├── src/payments/                 manual、Moneris、finalizer、provider resolution
│   ├── src/crm/                      Website CRM dual-write
│   ├── src/email/                    transactional outbox enqueue
│   ├── src/integrations/             Canada Post、ERP product/catalog/inventory
│   ├── src/middleware/               rate limit、request ID、遗留 idempotency middleware
│   └── src/smoke.ts                  API smoke
├── apps/worker/
│   └── src/index.ts                  邮件、库存过期、支付 recovery、ERP、retention、catalog sync
├── packages/db/
│   ├── prisma/schema.prisma          数据模型真源
│   ├── prisma/migrations/            41 migrations
│   ├── src/seed.ts                   本地/受控 RBAC seed
│   ├── src/permissions.ts             初始权限列表
│   ├── src/migrate-production.ts      生产 migration wrapper
│   ├── src/preflight-existing-database.ts
│   ├── src/data-retention.ts
│   └── src/password.ts
├── packages/cli/                     machine/ops CLI
├── src/                              Next storefront + Dashboard
├── Dockerfile.backend                API/Worker/DB/CLI 共用 backend image
├── docker-compose.yml                本地 PostgreSQL
├── docker-compose.staging.yml        staging runtime
├── docker-compose.production-server.yml 生产 runtime
├── .env.example                      本地变量模板
├── .env.production.example           生产变量名模板，不含 secret
└── docs/                             规范、runbook、报告、handoff
```

### 三个“真源”

1. API 路径和前端类型：`src/lib/api/api-contract.ts`
2. Dashboard 路由权限：`apps/api/src/dashboard/access.ts`
3. 数据库结构：`packages/db/prisma/schema.prisma`

改 API 时必须同步运行时路由、类型契约、Dashboard ACL、测试和文档。

---

## 6. API 启动和 middleware

### 6.1 进程入口

`apps/api/src/index.ts`：

1. `loadApiConfig()`
2. `createApp()`
3. `serve()` 监听 `API_HOST/API_PORT`
4. SIGINT/SIGTERM graceful shutdown，最多等待 25 秒

默认 `VANSTRO_RUNTIME_MODE` 是 deployment；缺省配置按严格生产模式处理。

### 6.2 `createApp()` 装配顺序

`apps/api/src/app.ts`：

1. CORS
2. Cookie session 写请求的 trusted Origin/CSRF 边界
3. Request ID 和结构化访问日志
4. Public write rate limit
5. API routes mount
6. health routes
7. 404 和统一错误映射

API 路由均挂在 `/api/v1`。健康检查在 `/health/*`，不是 `/api/v1/health` 的唯一入口。

### 6.3 CORS

固定允许：

- `https://vanstro.ca`
- `https://www.vanstro.ca`
- 历史 `vanstro.vip` 域名
- localhost/127.0.0.1 开发地址
- `VANSTRO_CORS_ORIGINS` 可追加

允许 credentials、Authorization、Content-Type、X-Cart-Token、X-Payment-Signature、X-Reservation-Token、Idempotency-Key、X-Request-Id。

### 6.4 Cookie Origin 防护

仅在：

- deployment mode
- 非 GET/HEAD/OPTIONS
- 使用 `__Host-vanstro-session`
- 没有 Authorization header

时强制 Origin 在 allowlist。Bearer 请求不走这一 cookie-only 检查。

### 6.5 Rate limit

deployment 使用 PostgreSQL 分布式桶：

| 组 | 限制 |
|---|---|
| login/register | 10 / 15 分钟 / IP |
| checkout/cart/payment callback/address | 60 / 15 分钟 / IP |
| contact/dealer/support/reviews/consent | 30 / 小时 / IP |
| analytics pageviews | 120 / 15 分钟 / IP |

生产已设置 `TRUST_PROXY_HEADERS=true`，同时 nginx 将 `X-Forwarded-For` 强制覆盖为 `$remote_addr`，不会信任客户端传入的 XFF。伪造 XFF 的生产验证确认限流键使用真实公网 IP。若未来在 nginx 前增加 CDN/负载均衡，必须重新设计可信代理链，不能直接使用 `$proxy_add_x_forwarded_for`。

过期 rate-limit buckets 由 Worker retention 清理；Redis adapter 文件存在但未接入当前生产链路。

---

## 7. 认证、账户和 RBAC

### 7.1 Customer session

- token：32-byte random Base64URL
- 数据库只保存 SHA-256 hash
- 默认 TTL：7 天
- 支持 `Authorization: Bearer` 和 `__Host-vanstro-session` cookie
- Bearer 优先
- 每次读取 session 时重新聚合当前角色/权限

deployment 注册/登录的 cookie：

```text
__Host-vanstro-session=<opaque value>
Path=/
HttpOnly
Secure
SameSite=Lax
```

生产响应体不返回明文 access token。

### 7.2 Customer auth endpoints

```text
POST /auth/customer/register
POST /auth/login
GET  /auth/me
POST /auth/refresh
POST /auth/logout
POST /auth/logout-all
```

注册一个事务内创建：User、CustomerProfile、PasswordCredential、CRM contact、welcome EmailOutbox。之后创建 session 和 LoginEvent。

密码：PBKDF2-SHA256，最少 12 字符，默认 310,000 iterations。

### 7.3 Service account

- token 前缀 `vsa_`
- DB 只保存 hash
- 默认有效 90 天，上限 365 天
- 通过角色聚合权限
- Worker catalog sync、CLI、payment recovery 使用 machine access

### 7.4 Dashboard RBAC

Dashboard middleware 要求：

1. session 存在
2. user.kind=`admin`
3. `dashboard.access`
4. 当前 route 的具体 permission
5. ACL 中未登记的 route 默认 403

ACL 真源：`apps/api/src/dashboard/access.ts`。初始权限真源：`packages/db/src/permissions.ts`。

主要权限：

```text
dashboard.access
users.read / users.manage
products.read / products.write
inventory.read / inventory.write
orders.read / orders.update / orders.assign
payments.recover
crm.read / crm.update / crm.promote
email.outbox.read / email.outbox.retry
email.provider.read / email.provider.write
email.templates.read / email.templates.write
analytics.read
erp.sync.read / erp.sync.retry / erp.webhooks.read / erp.catalog.sync
content.read / content.write
settings.read / settings.write
audit_logs.read
```

新增权限时必须同时更新：

- `packages/db/src/permissions.ts`
- `apps/api/src/dashboard/access.ts`
- `src/lib/dashboard/tab-permissions.ts`
- seed/迁移
- 测试和文档

---

## 8. Commerce / Checkout / Inventory

### 8.1 Cart identity

购物车来源：

- 已登录 customer session
- `X-Cart-Token` guest token
- 新 guest 请求自动创建 cart

`GET /cart` 不是纯健康检查：没有 token 时可能创建 guest cart；已登录时可能合并 guest cart。

cart 每 user 唯一；每 cart/SKU 唯一。Guest cart 合并会按 SKU 相加并删除旧 guest cart。

### 8.2 Checkout contract

```text
POST /checkout/session
```

强制：

- `Idempotency-Key`，最长 128 字符
- firstName
- lastName
- email
- phone
- fulfillment：pickup/delivery
- paymentMethod：card/pos/cash

Delivery 额外要求完整加拿大地址：

- shippingAddressLine1
- shippingAddressLine2 可选
- shippingCity
- shippingProvince
- shippingPostalCode
- shippingCountry=CA

后台运行时支持 `couponCode`，但当前前端 public TypeScript contract 没有该字段，属于 contract drift；当前 storefront 没有正式 coupon entry UI。

### 8.3 Checkout 幂等和并发

幂等权威不是遗留的内存 middleware，而是数据库 + checkout handler：

- PaymentSession.idempotencyKey unique
- body SHA-256 requestHash
- cart identity 比对
- PostgreSQL transaction advisory lock(cartId)
- 相同请求 replay
- key 复用但 body/cart 不同则拒绝
- 同 cart card pending 恢复原 session
- 无 provider confirmation 的 manual pending 可安全 supersede
- supersede 同事务释放 reservation、回退 quantityReserved、入队 inventory_release

遗留 `apps/api/src/middleware/idempotency.ts` 未被装配，不要误以为它是当前幂等实现。

### 8.4 Reservation 生命周期

Checkout transaction 内完成：

1. CRM guest checkout upsert/event
2. PaymentSession 创建
3. 条件更新 `quantityReserved`
4. InventoryReservation 创建

条件是：

```text
quantityOnHand - quantityReserved >= requested
```

正常路径：

```text
checkout -> active reservation
paid -> consumed, onHand--, reserved--
expired/superseded -> released/expired, reserved--
```

数据库约束：

- snapshot `(skuId, dealerLocationId)` unique，含 NULLS NOT DISTINCT
- quantity 非负
- reserved <= onHand
- 同 payment session/SKU 最多一条 active reservation

### 8.5 Inventory source

- `manual`：不启用 ERP freshness gate，当前生产使用此模式
- `erp`：启用 inventory snapshot freshness TTL，过期时 checkout 返回 `INVENTORY_REFRESHING`

当前生产所有 active-product snapshot 为 10，仅是人工控制数量，不是 ERP authoritative stock。

---

## 9. Payment / Order 最重要的链路

### 9.1 Provider resolution

```text
card -> Moneris MCO（deployment）
pos  -> Manual HMAC
cash -> Manual HMAC
```

Local 非 deployment + demo flag 时 card 才可能使用 Demo provider。deployment 禁止 demo 和 payment simulation。

### 9.2 Moneris MCO

`apps/api/src/payments/moneris.ts`：

- endpoint：`gateway.moneris.com/chktv2/request/request.php`
- preload：金额、paymentSessionId、order_no、customer email
- 返回 ticket 给前端
- receipt verification：
  - gateway success
  - receipt success
  - order_no 必须等于 paymentSessionId
  - 金额必须精确匹配 cents
  - 必须存在 transaction number

前端 hosted MCO JS 只接收 ticket，不接收 PAN。真实卡 callback 尚未执行真实扣款验收。

### 9.3 Manual POS/cash

Manual provider 使用：

```text
HMAC_SHA256(paymentSessionId + ":" + providerPaymentId, PAYMENT_CALLBACK_SECRET)
```

Dashboard `mark-paid`：

- 只允许 pending
- 拒绝 card
- 内部生成 provider ID 和 HMAC
- 动态 import `../app.js` 避免循环依赖
- 调统一 payment callback/finalizer

不要让浏览器直接调用 callback，也不要把 callback secret 发给客户端。

### 9.4 Callback/finalizer

`POST /payments/callback` 先校验 provider，再写 provider_confirmed event，然后进入 `finalizeConfirmedPayment()`。

finalizer 使用 session advisory lock，并在一个 DB transaction 内：

1. session CAS -> paid
2. 防重复 order
3. 验证 reservation 与 order items 完整对应
4. 创建 Order/OrderItem
5. `quantityOnHand--`
6. `quantityReserved--`
7. reservation -> consumed
8. 清空 cart items
9. 写 paid OrderStatusEvent
10. 入队 order_confirmation
11. 入队 ERP order_create
12. CRM stage -> customer
13. 写 order_paid CRM event
14. 登录客户额外入队 customer_sync
15. 写 order_created PaymentEvent

唯一约束：

- Order.paymentSessionId
- PaymentSession.providerPaymentId
- PaymentEvent compound unique

### 9.5 Payment recovery

Worker recovery 只处理已经存在 `provider_confirmed` 的本地事件。如果浏览器在 Moneris 已扣款、但 callback 前断网，当前系统可能没有本地事件可供 recovery；这是真实 card 闭环的 P0 风险。

### 9.6 Refund boundary

当前已实现 Moneris eSELECTplus server-side Refund：使用原 `order_id`、原 gateway `txn_number`、退款金额和 `crypt_type`，并在网络结果不明确时执行一次官方 `status_check`。退款使用 `refund_processing` 做并发保护；card session 禁止人工 `confirm_refunded` 绕过 provider。Dashboard reconciliation 仍保留 manual cash/POS 的人工确认路径。由于当前没有一笔可安全退款的真实 card transaction，provider 退款资金移动尚未做生产实款验收。

---

## 10. Order 状态、ERP webhooks 和取消

Order 状态：

```text
paid -> processing -> fulfilled
paid -> cancelled
processing -> cancelled
fulfilled/cancelled -> terminal
```

ERP webhook：

- order-status
- shipment
- inventory
- customer-update

均要求 HMAC，并以 `ErpWebhookEvent(erpSystem,eventType,externalId)` 做幂等。

订单取消会：

- 本地回补 quantityOnHand
- 创建 inventory_release job
- PaymentSession -> refund_pending
- 创建 refund_requested event

取消不会：

- 调用 Moneris refund
- 删除订单
- 撤回已发送邮件
- 自动取消已经存在的 ERP order_create

因此 ERP 接通前必须先分类历史 pending jobs，不能直接打开 Worker 对外发送。

---

## 11. Website CRM

`CrmContact.email` 是主要身份，注册时关联 `userId`。

生命周期：

```text
registered -> engaged -> checkout_started -> customer/high_intent
```

事件来源：

- registration
- login
- cart_add
- checkout_started
- favorite_add
- order_paid
- notes/stage changes

CRM 是 Website 一等数据；ERP 只通过 `customer_sync` queue 对接，不作为当前 CRM 真源。

已知边界：checkout event debounce 和 promote-to-ERP job 去重主要是查询后写入，不是完整数据库唯一约束；极端并发可能重复事件/job。

---

## 12. Email Outbox 与 Worker

### 12.1 Outbox

业务事务只 enqueue EmailOutbox，不直接发 SMTP。主要模板：

- welcome
- order_confirmation
- shipment_notification
- order_delivered
- contact/dealer/review/support acknowledgements

Dashboard `EmailProviderAccount(key=default_smtp)` 优先，环境变量 SMTP fallback。生产强制 TLS，SMTP 密码应加密存储。

### 12.2 Worker tick 顺序

`apps/worker/src/index.ts` 当前顺序：

1. recover confirmed payments
2. release expired reservations
3. delete expired consent events
4. apply data retention
5. process privacy requests
6. send pending emails
7. push pending ERP orders
8. push pending ERP customers
9. push pending ERP inventory releases
10. scheduled ERP catalog sync
11. log backlog

默认 `WORKER_POLL_INTERVAL_MS=30000`。

`--once` 执行一轮后退出。连续 3 个 tick 任何 handler 失败，Worker 退出交给 Docker restart。

### 12.3 Email reliability

- CAS claim：pending/retry_wait -> running
- lockedBy/lockedAt lease
- 默认最多 5 次
- 指数退避
- 固定 Message-ID：`<emailOutboxId@vanstro.local>`

语义是 at-least-once，不是 exactly-once：SMTP 接受后、DB 标 sent 前崩溃可能重发。当前没有业务 event dedupe unique constraint。

### 12.4 ERP jobs

类型：

- order_create
- customer_sync
- inventory_release

默认最多 5 次，依赖 ERP 对 `Idempotency-Key` 正确实现。ERP 未配置时 handler 直接返回，pending jobs 可能长期存在；当前 operations alerts 不统计 oldest pending age。

### 12.5 Privacy/retention

Worker 处理：

- page views 90 天
- login events 365 天
- completed email payload 90 天后清 payload
- ERP attempts 180 天
- webhook payload 180 天后清空
- expired payment sessions 90 天
- rate-limit buckets 2 天

Privacy request `processing` 没有明确 lease/stale recovery 字段；Worker 崩溃可能留下永久 processing，需要后续加固。

---

## 13. 数据库模型和 migrations

当前 Prisma schema 有 72 个 model、23 个 enum、40 个 migrations；新增 `WorkerHeartbeat` 与 `refund_processing` 支撑生产监控和 provider refund 并发保护。

### 13.1 数据域

- Identity：User、CustomerProfile、PasswordCredential、RefreshSession、LoginEvent
- RBAC：Role、Permission、RolePermission、UserRole、ServiceAccount、ServiceAccountToken
- Catalog：Category、Product、PlatformSku、ProductAsset、ProductSpecification、Price、Promotion
- Commerce：Cart、CartItem、InventorySnapshot、InventoryReservation、PaymentSession、PaymentEvent、Order、OrderItem、OrderStatusEvent
- CRM：CrmContact、CrmTask、CrmContactEvent、CrmContactNote
- Dealer：Dealer、DealerLocation、DealerServiceArea、DealerErpLink
- Content：SiteContentModule、LegalPage、Article
- Email：EmailTemplate、EmailTemplateVersion、EmailOutbox、EmailDeliveryAttempt、EmailEvent、EmailSuppressionList、EmailProviderAccount
- ERP：ErpSyncJob、ErpSyncAttempt、ErpCustomerLink、ErpOrderLink、ErpWebhookEvent、CatalogSyncRun
- Privacy/analytics：PrivacyRequest、PrivacyConsentEvent、PageViewEvent
- Operations：AuditLog、RateLimitBucket、McpToolInvocation

### 13.2 Migration 目录

```text
packages/db/prisma/migrations/
```

当前从：

```text
20260708223336_init
```

到：

```text
20260730260000_production_rbac_bootstrap
```

关键 hardening：

- `20260726140000_commerce_inventory_hardening`
- `20260730100000_inventory_nonnegative_constraints`
- `20260730110000_checkout_idempotency`
- `20260730120000_payment_reconciliation`
- `20260730160000_distributed_rate_limits`
- `20260730170000_relational_indexes`
- `20260730230000_financial_invariants`
- `20260730250000_catalog_sync_global_singleton`
- `20260730260000_production_rbac_bootstrap`

Prisma migration 没有 down migration。生产回滚优先 forward-fix；涉及数据损失时只能在 incident command 下恢复备份/PITR。

注意：部分金融 constraint 使用 `NOT VALID`，新写入受约束但历史行不代表已经完成全表 validation。

---

## 14. 本地开发和验证

### 14.1 推荐环境

- Node 22
- pnpm 11.13.0
- Docker
- PostgreSQL 16

### 14.2 初始化

```bash
cd /Users/zhangguannan/Documents/codex/vanstro
pnpm install --frozen-lockfile
pnpm db:generate
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

本地 `docker-compose.yml`：

- container：`vanstro-postgres`
- host：`127.0.0.1:${POSTGRES_HOST_PORT:-15432}`
- database 默认：`vanstro_dev`

### 14.3 启动三端

```bash
pnpm api:dev       # API :4000
pnpm worker:dev
pnpm dev           # Next :3000
```

或：

```bash
pnpm stack:dev
```

### 14.4 后端门禁

```bash
pnpm typecheck
pnpm test:db
pnpm test:api
pnpm test:worker
pnpm api:smoke
```

聚合：

```bash
pnpm qa:backend
```

构建：

```bash
pnpm build:backend
pnpm build
```

生产前完整 source/artifact 门禁：

```bash
pnpm qa:ci
```

不要在未知生产数据库运行 `api:smoke`；该脚本包含写入、订单、邮件和后台操作。

### 14.5 本地 E2E

```bash
pnpm qa:local-staging
```

该脚本会创建/删除隔离数据库、启动 Mailpit、ERP mock、API、Worker。它是本地验证，不等于真实生产支付或真实 ERP 验收。

---

## 15. CI 和 Docker

### CI

`.github/workflows/backend-ci.yml` 使用：

- Node 22
- pnpm 11.13.0
- PostgreSQL 16
- migrate deploy
- seed
- backend build
- `qa:backend`
- backend Docker image API readiness smoke
- Worker `--once` smoke

### Dockerfile.backend

多阶段构建：

1. node 22 build image
2. 安装 openssl/corepack
3. 安装 workspace production dependencies
4. Prisma generate
5. build DB/API/Worker/CLI
6. runtime image 只复制 dist、schema 和生产依赖
7. runtime 默认 user 为 `node`

同一个 backend image 用于：

- migrate
- API
- Worker
- CLI

---

## 16. 生产服务器部署事实和命令

### 16.1 实际目录

```text
服务器：deploy@<PRODUCTION_HOST>

生产根目录：/opt/vanstro-production/
生产 app：/opt/vanstro-production/app/
生产 env：/opt/vanstro-production/.env.production
生产 env 权限：600 root:root
生产 Compose：/opt/vanstro-production/app/docker-compose.production-server.yml
Compose working dir：/opt/vanstro-production/app
Compose project：vanstro-production
```

不要在文档或聊天中输出 `.env.production` 内容。

### 16.2 Compose 服务

```text
vanstro-production-postgres-1
vanstro-production-api-1
vanstro-production-worker-1
vanstro-production-migrate-1（one-shot，完成后退出）
```

推荐先执行只读状态：

```bash
ssh -o ControlPath=/tmp/vanstro-ssh-control/%C deploy@<PRODUCTION_HOST> \
  'cd /opt/vanstro-production/app && \
   docker compose --env-file /opt/vanstro-production/.env.production \
   -p vanstro-production \
   -f docker-compose.production-server.yml ps'
```

日志：

```bash
ssh -o ControlPath=/tmp/vanstro-ssh-control/%C deploy@<PRODUCTION_HOST> \
  'docker logs --since 15m vanstro-production-api-1'

ssh -o ControlPath=/tmp/vanstro-ssh-control/%C deploy@<PRODUCTION_HOST> \
  'docker logs --since 15m vanstro-production-worker-1'
```

容器不可猜名时先：

```bash
docker ps -a --filter name=vanstro-production \
  --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'
```

### 16.3 生产端口

| 服务 | 绑定 |
|---|---|
| API | `127.0.0.1:4000 -> 4000` |
| PostgreSQL | `127.0.0.1:15434 -> 5432` |
| Worker | 无公网端口 |
| staging API | `127.0.0.1:4001 -> 4000` |
| staging PostgreSQL | `127.0.0.1:15433 -> 5432` |

生产和 staging Docker network/volume 独立：

```text
vanstro-production_default
vanstro-staging_default
vanstro-production_production_postgres_data
vanstro-production_production_postgres_backups
vanstro-staging_staging_postgres_data
vanstro-staging_staging_postgres_backups
```

### 16.4 nginx

站点配置：

```text
<NGINX_VHOST_DIR>/vanstro.ca.conf
```

扩展配置：

```text
<NGINX_VHOST_DIR>/extension/vanstro.ca/api.conf
```

当前 API location：

```nginx
location ^~ /api/v1/ {
    proxy_pass http://127.0.0.1:4000;
}
location = /health/live {
    proxy_pass http://127.0.0.1:4000/health/live;
}
location = /health/ready {
    proxy_pass http://127.0.0.1:4000/health/ready;
}
```

日志：

```text
<NGINX_LOG_DIR>/vanstro.ca.log
<NGINX_LOG_DIR>/vanstro.ca.error.log
```

当前 nginx 仅允许 `TLSv1.2 TLSv1.3`。配置已通过 `nginx -t`，并用 OpenSSL 验证 TLS 1.1 被拒绝、TLS 1.2 成功。

只读检查：

```bash
nginx -t
nginx -T
curl -fsS https://vanstro.ca/health/ready
```

### 16.5 生产 migration

生产 wrapper：

```text
packages/db/src/migrate-production.ts
```

要求：

- `VANSTRO_RUNTIME_MODE=deployment`
- `ALLOW_PRODUCTION_MIGRATION=true`
- `DATABASE_URL`
- 先 backup
- inventory preflight
- lock timeout 5s
- statement timeout 15m

不要直接在生产容器里执行 `prisma migrate dev`。不要手工修改 `_prisma_migrations`。

### 16.6 备份

变更前：

```text
<BACKUP_DIR>/vanstro-production/20260727T201109Z-before-inventory-10/vanstro-production.dump
```

E2E 完成后最新备份：

```text
<BACKUP_DIR>/vanstro-production/20260727T202215Z-after-customer-chain-e2e/vanstro-production.dump
```

均为 PostgreSQL custom format，mode 600，并通过 SHA-256、`pg_restore --list` 验证。

生产已启用 PostgreSQL `archive_mode`，`archive_timeout=5min`；每日 02:10 logical dump、每周日 03:10 physical base backup、每月 1 日 04:10 隔离 PITR restore drill。Logical 保留 14 天，base 保留 28 天，WAL 保留 35 天。严格恢复演练已验证 base + archive WAL 恢复到记录 heartbeat；当前生产基线为 41 migrations、143 products。RPO 目标 5 分钟，RTO 目标 30 分钟。另有受限只读 SSH key 和 macOS LaunchAgent 每日拉取异机副本；该副本依赖本机在线，不等同于云对象存储。

恢复原则：

1. 不直接对当前生产 DB `pg_restore`
2. 先恢复到隔离 DB
3. 执行 migrations/preflight/invariants/API smoke
4. 确认数据损失窗口
5. 对账 Moneris、退款、pending confirmations
6. 由 incident commander 批准生产恢复

### 16.7 Release / rollback

前端：新建 immutable release -> 上传 -> SHA-256 -> `nginx -t` -> reload -> smoke。旧目录保留。

API/Worker：回滚到前一 image digest；当前资料没有可直接执行的“前一生产 image digest”记录，因此下次部署必须先记录：

- image digest
- git source SHA
- archive SHA
- migration state
- rollback command

Schema：优先 forward-fix，不回滚 migration history。

---

## 17. 生产 E2E 证据摘要

最新生产 E2E 已验证：

- 商品浏览、库存 API
- guest cart、加购
- 注册、登录、登出、安全 cookie
- 手工加拿大地址
- 收藏、账户订单
- pickup cash checkout
- checkout replay
- delivery 手工地址、Manitoba tax、1500 cents delivery
- POS -> card supersede
- card replay
- Moneris preload/ticket
- Dashboard cash mark-paid
- order creation
- inventory 10 -> 9 -> cancel -> 10
- cart clear after payment
- CRM customer/order_paid
- welcome/order confirmation sent
- Worker expiry release
- Dashboard read-only API
- critical public HTTP paths
- readiness/nginx/log sampling

证据：

```text
tasks/checkpoints/2026-07-27-production-customer-chain-e2e.md
```

### 未完成真实外部验收

1. 真实 Moneris card authorization/capture/receipt/settlement
2. 浏览器在 provider 已扣款但 callback 前关闭时的自动发现/recovery
3. Moneris refund/void API
4. ERP sandbox/production outbound 和 inbound webhook
5. PITR/RPO/RTO/异机恢复
6. SPF/DKIM/DMARC 和长期 SMTP retry/duplicate drill

---

## 18. 遗留问题优先级

### P0

#### P0-1 真实 card 闭环主动延期

用户于 2026-07-28 明确选择“暂不真实扣款”。因此 preload/ticket/iframe 通过不等于真实扣款闭环通过；该外部资金验收为主动延期，没有新的持卡人和金额授权不得执行。当前缺：

- 真实 authorization/capture
- receipt/order/inventory 对账
- callback 前关闭/断网 recovery
- settlement 对账
- duplicate callback

#### 已关闭的原 P0

- Moneris server-side Refund 已实现并部署；仍需在第一笔获授权真实 card canary 后验证实际资金退款。
- 可信代理限流身份已修复：nginx 覆盖 XFF，API 信任代理头，伪造 XFF 测试通过。
- 自动 logical/base/WAL/PITR 和异机拉取已建立；仍建议未来增加云对象存储副本。

### P1

- ERP 未配置但 paid order 会创建 pending ERP jobs；当前有 7 个历史 pending，启用 ERP 前必须分类。Operations 已告警 pending >15 分钟。
- Worker heartbeat 和 pending-age alerts 已上线；仍缺独立外部监控服务对 API/Worker/backup cron 做主动探测。
- SMTP 是 at-least-once，存在重复发送窗口。
- `mark-paid` 业务最终化和 audit 写入不在同一事务。
- provider initiation cleanup 是第二事务，失败时依赖 Worker/alerts 兜底。
- PaymentSession 没有结构化保存 provider/account/environment version，callback 依赖当前配置解析。
- 取消订单不会自动取消已存在的 ERP order_create job。
- ERP outbound exactly-once 依赖上游正确处理 Idempotency-Key。
- financial constraints 部分使用 `NOT VALID`，历史数据未完全 validation。

### P2

- couponCode 后端接受但 public contract 未声明，且 storefront 没有正式优惠券 UI。
- 匿名 `/auth/me` 和 `/account/favorites` 预期 401 会产生浏览器 console/network noise。
- provider module-level cache 和 deprecated `PAYMENT_PROVIDER` 分支应清理。
- PrivacyRequest processing 没有 lease/stale recovery。
- CRM debounce/promote/job enqueue 不是完全数据库唯一保证。
- 未接入的内存 idempotency middleware 应删除或明确标记遗留。
- nginx 已收紧到 TLS 1.2/1.3；未来证书/cipher 变更仍需兼容性测试。
- Worker heartbeat 与 queue-age alerts 已上线；仍缺独立外部告警通知渠道和集中日志平台。
- 生产工作树未形成 clean reproducible commit；当前线上前端来自 protected working tree。
- 当前明确回滚前端不是 fullstack5 紧邻版本，回滚前要验证 payment/API contract 兼容性。

---

## 19. 接手者第一天 checklist

### 只读确认

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git stash list

ssh -o ControlPath=/tmp/vanstro-ssh-control/%C deploy@<PRODUCTION_HOST> \
  'docker ps -a --filter name=vanstro-production --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"'

curl -fsS https://vanstro.ca/health/live
curl -fsS https://vanstro.ca/health/ready
```

### 本地验证

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:db
pnpm test:api
pnpm test:worker
pnpm build:backend
```

### 任何生产写操作前

确认以下事项：

- 当前用户明确授权了该具体生产动作
- 当前 active release 和 rollback release 已记录
- 当前 image digest、source SHA、archive SHA 已记录
- 已有可恢复 backup
- 已完成 preflight
- 已确认是否触发邮件、库存、订单、ERP、支付副作用
- 已确认是否需要财务/运营/隐私批准
- 变更后有 smoke 和 rollback 计划

### 支付规则

- 不要在没有明确真实扣款授权时调用 card checkout
- 不要直接调用 payment callback
- 不要自动重试 mark-paid
- 不要把 internal `refunded` 当作 PSP refund
- 不要把 POS 当作“绝对无电子扣款”测试方式；POS 可能涉及真实终端，完全无资金 QA 使用 cash，但 mark-paid 仍会产生生产订单副作用

---

## 20. 相关文件索引

| 主题 | 文件 |
|---|---|
| API 入口 | `apps/api/src/index.ts`, `apps/api/src/app.ts` |
| API config | `apps/api/src/config.ts` |
| Auth | `apps/api/src/routes/auth.ts`, `apps/api/src/auth/session.ts` |
| ACL | `apps/api/src/dashboard/access.ts`, `packages/db/src/permissions.ts` |
| Commerce | `apps/api/src/routes/commerce/index.ts` |
| Payment | `apps/api/src/payments/index.ts`, `manual.ts`, `moneris.ts`, `finalize.ts` |
| CRM | `apps/api/src/crm/service.ts` |
| Email enqueue | `apps/api/src/email/queue.ts` |
| Worker | `apps/worker/src/index.ts`, `config.ts` |
| Schema | `packages/db/prisma/schema.prisma` |
| Migration wrapper | `packages/db/src/migrate-production.ts` |
| Existing DB preflight | `packages/db/src/preflight-existing-database.ts` |
| Retention | `packages/db/src/data-retention.ts` |
| Local Compose | `docker-compose.yml` |
| Staging Compose | `docker-compose.staging.yml` |
| Production Compose | `docker-compose.production-server.yml` |
| Backend image | `Dockerfile.backend` |
| CI | `.github/workflows/backend-ci.yml` |
| Production checklist | `docs/PRODUCTION-RELEASE-CHECKLIST.md` |
| Current production E2E | `tasks/checkpoints/2026-07-27-production-customer-chain-e2e.md` |

---

## 21. 最终接手结论

当前 backend 已具备可运行的 API + PostgreSQL + Worker + Dashboard + storefront 交易闭环，并已完成一轮生产客户链路验证。最重要的系统边界不是“代码是否能运行”，而是：

1. 真实 card 收单/settlement/refund 仍需要外部财务验收；
2. ERP 当前断开，manual inventory 不是 ERP 真值；
3. 生产限流的 proxy IP 可信边界需要修正；
4. 生产自动备份/PITR/RPO/RTO 尚未形成操作化证据；
5. 生产部署来自受保护工作树，尚未形成可重现 clean release commit；
6. 邮件、ERP、审计、reconciliation 都是至少一次或跨事务边界，接手者不能宣称 exactly-once。

任何新 Agent 应先从本文件和最新 checkpoint 建立事实基线，不要从旧文档中的 “production not started” 或 “Moneris blocked” 历史段落推断当前状态。
