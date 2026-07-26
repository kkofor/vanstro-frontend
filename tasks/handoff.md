# 后端项目交接

> 填写时间：2026-07-26 03:05 CDT
> 仓库：`/Users/zhangguannan/Documents/codex/vanstro`
> 分支：`claude/dealer-neutral-copy-sync-20260721`
> 最后文档 commit：`05ece17`
> 最后功能 commit：`3eb35c5`
> 本文件路径：`tasks/handoff.md`（任务连续性真源）

配套材料：

| 材料 | 路径 | 状态 |
| --- | --- | --- |
| 完整项目代码 | monorepo 根目录（含 `apps/api`、`apps/worker`、`packages/db`、`src/`） | 可用 |
| README | `README.md`、`docs/backend/README.md`、`apps/api/README.md`、`apps/worker/README.md` | 可用 |
| CLAUDE.md | `CLAUDE.md` | 可用 |
| SPEC.md | `SPEC.md` | 可用 |
| DECISIONS.md | `DECISIONS.md` | 可用 |
| 任务连续性 | `tasks/handoff.md`（本文件） | 可用 |
| 详细后端 handoff | `docs/BACKEND-HANDOFF-2026-07-26.md` | 可用 |
| 会话项目清单 | `docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md` | 可用 |

---

## 1. 项目目标

- **后端要解决的问题：** 为加拿大橱柜/建材电商提供可上线的 Website API：目录、购物车结账、支付回调、订单履约状态、账户、Website CRM、邮件出站、ERP 同步队列、Dashboard 运营与 CMS，替代 mock/localStorage 作为业务真源。
- **当前阶段目标：** 本地全栈闭环已跑通并通过门禁；准备生产就绪（DNS/TLS/migrate/Worker/真实凭据）——**生产操作需用户另行授权**。
- **本轮原始需求：**
  1. 结账/支付/账户中心（Canada Post 地址 + Moneris card + POS/cash）
  2. 跨模块关联（注册/购物/订单/表单 → Dashboard；邮件；ERP 发货 → 用户订单状态）
  3. 用户确认范围「全量」：P0+P1 + 第一方 analytics + catalog cron + 模板编辑 + 后端审查；门禁绿后一次 commit、不 push
- **明确不在范围内的内容：**
  - 未经授权的生产部署 / DNS / `migrate deploy` 到生产 / push
  - 真实 Moneris prod / Canada Post 生产 key（仅接线 + checklist）
  - ERP 入站库存数量 webhook（上游 API 未就绪）
  - `POST /integrations/erp/webhooks/customer-update`
  - Checkout 促销折扣引擎
  - Dealer portal 独立产品面
  - 把 goal-loop 审计证据 / hermes-webui 等无关脏文件纳入功能交付

---

## 2. 技术栈与运行环境

- **语言及版本：** TypeScript ^6.0.3；本地验证时 Node `v25.9.0`（建议 Node 20+）
- **Web 框架：** Hono `^4.12.28` + `@hono/node-server`
- **数据库及版本：** PostgreSQL 16（`docker-compose.yml`：`postgres:16-alpine`）
- **ORM / 数据访问层：** Prisma `6.19.0`（`@prisma/client`）
- **缓存 / 消息队列：** 无 Redis/独立 MQ；Worker 轮询 DB 队列（`EmailOutbox`、`ErpSyncJob`）
- **身份认证方式：**
  - 客户/管理员：Bearer access token（session 表）
  - 访客购物车：`X-Cart-Token`
  - 访客订单：`guestOrderToken` / query `token`
  - 服务账号：Dashboard 签发 token（CLI/MCP/Worker catalog sync）
  - Dashboard 路由：RBAC permission（`access.ts`）
- **包管理器：** pnpm `11.13.0`
- **部署环境：** 本地 development 已验证；生产目标形如 `api.vanstro.ca`（DNS/部署**尚未在本会话授权执行**）
- **必需的外部服务：**
  - PostgreSQL（必需）
  - SMTP（env 或 Dashboard `EmailProviderAccount`；deployment 可不强制启动时有 SMTP）
  - Canada Post AddressComplete（可选；无 key 则手工地址）
  - Moneris Checkout（card 路径；无凭据则 card 不可用，POS/cash 仍可）
  - ERP HTTP API（outbound + product catalog；可 mock/失败重试）

---

## 3. 当前完成度

| 模块/需求 | 状态 | 对应文件 | 验证方式 | 备注 |
|---|---|---|---|---|
| Health / CORS / rate limit | 已完成且已验证 | `apps/api/src/app.ts`, `middleware/*` | `api:smoke`、typecheck | |
| Auth register/login/me/logout | 已完成且已验证 | `routes/auth.ts` | `test:api`、smoke | 注册入队 welcome |
| Catalog 公共读 | 已完成且已验证 | `routes/catalog.ts` | smoke、tests | |
| Cart / checkout / tax / shipping | 已完成且已验证 | `routes/commerce/*` | commerce-checkout tests、smoke | delivery 强制地址 |
| Canada Post autocomplete | 已完成但未验证 | `integrations/canada-post/*` | 单测 mock；**无真实 API key e2e** | 缺 `CANADA_POST_API_KEY` |
| Payments manual HMAC | 已完成且已验证 | `payments/manual.ts`, callback tests、smoke | simulate/mark-paid 路径 | |
| Payments Moneris | 部分完成 | `payments/moneris.ts` | 单元测试（preload/receipt mock） | **无 QA 凭据真实 card e2e** |
| Dashboard mark-paid | 已完成且已验证 | `dashboard/system.ts` | typecheck；逻辑经 callback | UI 已接线；未做独立 HTTP 集成测 |
| Orders statusEvents/shipment | 已完成且已验证 | `commerce/index.ts` formatOrder | commerce tests、smoke 订单路径 | |
| Account profile/addresses/orders/favorites | 已完成且已验证 | commerce account routes | smoke 含 account 段 | |
| Website CRM dual-write + Dashboard CRM | 已完成且已验证 | `crm/service.ts`, `dashboard/crm.ts` | crm service + dashboard crm tests | |
| Contact/dealer submissions → CRM | 已完成且已验证 | `routes/submissions.ts` | submissions tests | |
| Email outbox + worker send | 已完成且已验证 | worker `sendPendingEmails` | worker 代码 + seed；本地 SMTP 视 env | |
| Dashboard SMTP provider | 已完成但未验证 | `dashboard/system.ts` email/provider | typecheck；**未发真实测试信** | UI 已有 |
| Email template editor | 已完成但未验证 | templates API + DashboardPanels | typecheck；**未人工点 UI 验收** | |
| Pageviews + analytics summary | 已完成但未验证 | `routes/analytics.ts`, system summary | typecheck；**未浏览器 consent e2e** | consent 门控 |
| Catalog sync from ERP + cron | 已完成但未验证 | `erp-catalog-sync/*`, worker tick | 有 service tests；**未对真实 ERP 定时跑** | |
| ERP order/customer/inventory jobs | 部分完成 | worker ERP handlers | 代码存在；依赖 ERP 可达性 | |
| ERP shipment → email | 已完成但未验证 | commerce/erp webhook + email queue | 代码路径存在；**无真实 webhook 击穿** | |
| CMS navigation/home/footer/articles | 已完成且已验证 | `routes/cms.ts` | cms tests | |
| Dashboard RBAC ACL | 已完成且已验证 | `dashboard/access.ts`, permissions | dashboard tests | 新权限需 re-seed |
| Privacy consent | 已完成且已验证 | `routes/privacy.ts` | privacy tests | |
| 生产部署 | 未开始 | — | — | 需用户授权 |
| ERP inbound inventory qty | 未开始 | — | — | 上游 API |
| Checkout 促销引擎 | 未开始 | — | — | 延期 |
| OpenAPI 与代码同步 regenerate | 已知有问题 | `docs/openapi/*` | 未在本轮 regenerate | 契约以 `api-contract.ts` 为准 |

状态取值说明见模板；上表已严格区分「写完且验证」与「写完未验证」。

---

## 4. 本次实际修改

功能主体在 commit `3eb35c5`；文档在 `05ece17` 与本轮新增 `CLAUDE.md` / `SPEC.md` / `DECISIONS.md` / `tasks/handoff.md`。

### 新增文件（功能，节选）

- `apps/api/src/crm/service.ts`：Website CRM upsert/事件
- `apps/api/src/crm/service.test.ts`：CRM 单测
- `apps/api/src/dashboard/crm.ts` / `crm.test.ts`：Dashboard CRM API
- `apps/api/src/routes/analytics.ts`：pageviews
- `apps/api/src/integrations/canada-post/*`：AddressComplete
- `apps/api/src/integrations/erp-catalog-sync/*`：ERP→本地目录合并
- `packages/db/prisma/migrations/20260728120000_website_crm/`
- `packages/db/prisma/migrations/20260729120000_checkout_shipping_address/`
- `packages/db/prisma/migrations/20260729180000_ops_pageviews_catalog_sync/`
- Storefront：`src/app/account/**`、`checkout/payment`、`orders/lookup`、`CanadaAddressFieldset`、`PageViewTracker`、`PaymentClient` 等
- Dashboard：`DashboardPanels.tsx`、hooks、`src/lib/dashboard/*`

完整清单：`git show --name-status 3eb35c5`

### 修改文件（节选）

- `apps/api/src/routes/commerce/index.ts`：结账地址、formatOrder statusEvents/shipment、支付解析
- `apps/api/src/dashboard/system.ts`：mark-paid、email provider、analytics summary
- `apps/api/src/dashboard/access.ts`：新权限路由
- `apps/api/src/routes/submissions.ts` / `auth.ts`：CRM + welcome
- `apps/worker/src/index.ts`：SMTP DB 优先、catalog cron
- `packages/db/prisma/schema.prisma`、`permissions.ts`、`seed.ts`
- `.env.example`、`docs/API-CONTRACT-ALIGNMENT.md`
- 前台契约与 Dashboard/订单 UI

### 删除或废弃文件

- 无专门删除。DashboardShell 大段逻辑拆到 `DashboardPanels` + hooks（旧单体逻辑被重构，非物理删除历史）。

### 数据库变更

- **新增或修改的表/字段：** CRM contacts/events；PaymentSession/Order shipping 字段；`PageViewEvent`；`CatalogSyncRun`；`EmailProviderAccount`（见 schema）
- **Migration 文件：** 上列三个 `20260728*` / `20260729*`
- **是否已经执行：** 是（本地 `vanstro_dev`，`prisma migrate deploy` 已应用含 `20260729180000`）
- **是否可回滚：** Prisma migrate 无自动 down；需手工 SQL/恢复备份。开发库可重建。

### 修改先后顺序（功能）

1. Checkout shipping + Canada Post + payment method 分流
2. Account / order / Moneris-manual 联调
3. CRM + welcome + shipment email
4. mark-paid、SMTP provider、templates UI
5. pageviews + analytics summary
6. catalog cron + CatalogSyncRun
7. 门禁修复（CRM test 语法、submissions stub、smoke delivery 地址）
8. commit `3eb35c5` → 文档 `05ece17` → 本模板材料

### 「最后可运行版本」vs「当前版本」

- **最后可运行且门禁绿：** `05ece17`（含功能 `3eb35c5` + 文档）
- **当前工作树：** 另有未提交 goal-loop 证据抖动与无关 untracked；**不要**把它们当成功能交付的一部分
- 本轮新建的 `CLAUDE.md` / `SPEC.md` / `DECISIONS.md` / `tasks/handoff.md` 在填写时可能尚未 commit

---

## 5. API 实现状态

前缀均为 `/api/v1`（健康检查另有 `/health/*`）。完整 ACL 见 `apps/api/src/dashboard/access.ts`。路由约 **187** 个 method+path 注册点。

| Method | Path | 状态 | 鉴权 | 请求/响应说明 | 测试位置 |
|---|---|---|---|---|---|
| GET | `/health/ready` | 已完成且已验证 | 无 | DB ping | smoke |
| POST | `/auth/customer/register` | 已完成且已验证 | 无 | 会话 + welcome 出站 | auth/crm 相关 |
| POST | `/auth/login` | 已完成且已验证 | 无 | Bearer session | smoke |
| GET | `/auth/me` | 已完成且已验证 | Bearer | 当前用户 | smoke |
| GET/POST/PATCH/DELETE | `/cart*` | 已完成且已验证 | Bearer 或 `X-Cart-Token` | 购物车 | commerce tests、smoke |
| POST | `/checkout/session` | 已完成且已验证 | 同 cart | delivery 需 shipping* | commerce-checkout、smoke |
| GET | `/address/autocomplete` | 已完成但未验证 | 无 | Canada Post proxy | address-complete.test（mock） |
| GET | `/payments/sessions/:id` | 已完成且已验证 | token | 会话状态 | smoke |
| POST | `/payments/callback` | 已完成且已验证 | HMAC/provider verify | 创建订单 | payment-callback.test |
| POST | `/payments/simulate` | 已完成且已验证 | 模拟开关 | 仅 simulation | smoke |
| GET | `/orders/:id` | 已完成且已验证 | token/auth | `statusEvents`+`shipment` | commerce/smoke |
| GET | `/orders/:id/status` | 已完成且已验证 | token | 精简状态 | commerce |
| GET/PATCH | `/account/*` | 已完成且已验证 | Bearer | me/addresses/orders/favorites | smoke |
| POST | `/contact/leads` | 已完成且已验证 | 无+限流 | 写 lead+CRM | submissions.test |
| POST | `/dealer-applications` | 已完成且已验证 | 无+限流 | 申请+CRM | submissions.test |
| POST | `/analytics/pageviews` | 已完成但未验证 | 无；需 `consentAnalytics:true` | PV | typecheck only |
| POST | `/dashboard/payment-sessions/:id/mark-paid` | 已完成且已验证 | `orders.update` | 非 card | 经 callback；无独立测 |
| GET/PUT | `/dashboard/email/provider` | 已完成但未验证 | provider perms | SMTP 设置 | typecheck |
| POST | `/dashboard/email/provider/test` | 已完成但未验证 | write | 入队测试信 | 未真实发信 |
| GET | `/dashboard/analytics/summary` | 已完成但未验证 | `analytics.read` | 7 日摘要 | typecheck |
| GET | `/dashboard/crm/contacts*` | 已完成且已验证 | crm.* | CRM | dashboard/crm.test |
| POST | `/dashboard/catalog/sync-from-erp` | 已完成但未验证 | products.write | CatalogSyncRun | erp-catalog-sync tests（单元） |
| * | 其余 dashboard/cms/erp/cli/mcp | 已完成且已验证 / 部分完成 | 见 access.ts | 见契约文档 | 分散在 `*.test.ts` + smoke |

契约真源：`src/lib/api/api-contract.ts` + `docs/API-CONTRACT-ALIGNMENT.md`。OpenAPI 快照**可能过时**。

---

## 6. 尚未完成的工作

1. **[P0] 生产 API 基础设施（DNS/TLS/migrate/Worker/SMTP）**
   - 当前进度：未开始（明确禁止擅自操作）
   - 下一步：向用户要授权与生产密钥清单；按 `FRONTEND-TO-BACKEND-HANDOFF-REQUEST` / 运维流程执行
   - 涉及文件：部署脚本、`.env` 生产副本（不入库）
   - 完成标准：外网 `health/ready` + 写入型 smoke 对生产 DB
   - 风险：不可逆 migrate；密钥泄露

2. **[P0] Moneris QA 真实 card e2e**
   - 当前进度：代码接线 + 单元 mock；缺凭据
   - 下一步：按 `docs/reports/moneris-credentials-checklist.md` 填 env → 跑 checkout card
   - 涉及文件：`payments/moneris.ts`、PaymentClient
   - 完成标准：preload→SDK→receipt→订单 paid
   - 风险：金额/order_no 校验失败

3. **[P1] Canada Post 真实 autocomplete**
   - 当前进度：代理 + 前端；缺 key
   - 下一步：填 `CANADA_POST_API_KEY` 浏览器验收
   - 涉及文件：`integrations/canada-post`、`CanadaAddressFieldset`
   - 完成标准：选建议填充地址字段
   - 风险：配额/CORS 代理错误

4. **[P1] ERP 入站库存 + customer-update webhook**
   - 当前进度：未开始
   - 下一步：等 ERP 合同 API；写 webhook + 幂等
   - 涉及文件：`routes/erp-integration.ts`、inventory models
   - 完成标准：快照与 ERP 一致；有测试
   - 风险：字段映射不一致

5. **[P2] 浏览器验收 Dashboard SMTP/模板/Analytics**
   - 当前进度：API+UI 已写；未人工点通
   - 下一步：seed 权限 → 登录 Dashboard → 保存 SMTP → 发测试信 → Operations 看 PV
   - 完成标准：邮件入收件箱；PV 计数增加
   - 风险：权限未 re-seed 导致 Tab 不可见

6. **[P2] OpenAPI regenerate + 契约 diff**
   - 当前进度：可能漂移
   - 下一步：`pnpm generate:openapi`（若脚本存在）并对齐
   - 完成标准：与 `api-contract.ts` 无冲突

7. **[P2] Checkout 促销折扣引擎**
   - 当前进度：未开始
   - 下一步：产品定价规则设计后再做

---

## 7. 已知问题与技术债

| 严重程度 | 问题 | 复现步骤 | 推测原因 | 建议修复 |
|---|---|---|---|---|
| 中 | Moneris/Canada Post 生产路径未实跑 | 不填 key 走 card/autocomplete | 缺凭据 | 业务提供 QA key |
| 中 | 新权限对已有 DB 不可见 | 旧库不开 email/analytics Tab | seed 未重跑 | `db:seed` 或手工赋权 |
| 中 | OpenAPI 可能过时 | 对比新旧 endpoint | 未 regenerate | 重新生成并审查 |
| 低 | `docs/DEVELOPING.md` 曾写错库存策略 | 读旧文档 | 文档滞后 | 已改为「先读 callback 代码」 |
| 低 | mark-paid 动态 import createApp | 读 system.ts | 避免循环依赖 | 保持；勿改回顶层 import |
| 低 | Worker 无 `@vanstro/api` 包依赖 | catalog sync 走 HTTP | 刻意解耦 | 保持 |
| 低 | Prisma migrate advisory lock 超时 | 并行 migrate | schema-engine 残留 | kill 残留进程后 `migrate deploy` |
| 信息 | 工作树大量 goal-loop untracked | `git status` | 历史审计产物 | 勿误提交 |

---

## 8. 关键设计决策

- **决策：** 支付 `card`→Moneris；`pos`/`cash`→manual HMAC；Dashboard mark-paid 仅非 card
  - 原因：加拿大卡收单 + 到店支付运营现实；避免运营绕过卡通道
  - 放弃：纯 Stripe；全部走模拟
  - 影响：本地默认可无 Moneris 跑通 POS/cash
  - 允许后续修改：是（加 provider 接口）

- **决策：** Website CRM 在站内；ERP CRM 仅 queue promote，不在 Dashboard 深编 ERP 字段
  - 原因：边界清晰（见 dashboard-erp-crm-handoff）
  - 影响：运营看 sync status，不直接改 ERP
  - 允许后续修改：是

- **决策：** Analytics 必须 `consentAnalytics: true` 才入库
  - 原因：隐私合规
  - 影响：无同意则 Operations PV 为 0
  - 允许后续修改：否（合规硬约束）

- **决策：** Worker SMTP 优先 Dashboard DB，env 回退；deployment 可不强制启动 SMTP
  - 原因：运营可在 UI 改邮件，不靠发版
  - 影响：未配置则出站失败进 retry
  - 允许后续修改：是

- **决策：** Catalog sync 由 Worker HTTP 调 API（service token），不直连 catalog 服务代码
  - 原因：包边界、权限复用 Dashboard
  - 允许后续修改：是

- **决策：** 全量一次 commit、不 push
  - 原因：用户明确要求
  - 影响：远程仍落后（ahead）

---

## 9. 配置和依赖

- **安装：** `corepack enable && pnpm install`
- **启动：**
  - DB：`docker compose up -d`（Postgres 16）
  - API：`pnpm api:dev`
  - Worker：`pnpm worker:dev`
  - Web：`pnpm dev`
- **测试：** `pnpm test:api`
- **冒烟：** `pnpm api:smoke`
- **类型检查：** `pnpm typecheck`
- **Lint：** 无统一 eslint 根脚本作为门禁；以 `typecheck` 为准
- **Migration：** `pnpm db:generate`；`pnpm db:migrate`（dev）或 `pnpm --filter @vanstro/db exec prisma migrate deploy`
- **Seed：** `pnpm db:seed`
- **构建：** 前端 `pnpm build:pages`；API 以 `tsx` 运行（无独立生产 bundle 门禁）

### 必需环境变量（仅名与用途）

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `VANSTRO_RUNTIME_MODE` | development/deployment 校验松紧 |
| `PAYMENT_CALLBACK_SECRET` | manual/simulate/mark-paid HMAC |
| `ENABLE_PAYMENT_SIMULATION` | 开放 simulate |
| `CANADA_POST_API_KEY` | 地址联想（可选） |
| `MONERIS_*` / `NEXT_PUBLIC_MONERIS_*` | 卡支付（可选） |
| `ERP_*` | ERP outbound/product/webhook |
| `VANSTRO_API_BASE_URL` | Worker 调 API |
| `VANSTRO_SERVICE_ACCOUNT_TOKEN` | Worker 服务身份 |
| `CATALOG_SYNC_INTERVAL_MS` | 目录同步间隔 |
| `SMTP_*` | 邮件回退 |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | seed 管理员（**勿提交真实值**） |
| `VANSTRO_CORS_ORIGINS` | 额外 CORS |
| `DELIVERY_FLAT_FEE_CENTS` | 配送费 |

本地依赖：`docker compose up -d` 起 Postgres；SMTP 可用 Mailpit/真实 SMTP；ERP 可指向 stub 或示例 URL。

---

## 10. 当前验证结果

**实际运行时间：2026-07-26 约 03:05 CDT（本机）**

| 项 | 结果 |
| --- | --- |
| 依赖安装 | 通过（沿用已有 `node_modules`；未重装） |
| 服务启动 | 通过（smoke 自举 `createApp`；未在本轮另开长驻进程记录） |
| 单元/API 测试 | **70 通过，0 失败**（`pnpm test:api`） |
| 集成测试 | 含在 `test:api` + `api:smoke`；无单独 pytest |
| Lint | 未跑专用 eslint 门禁（N/A） |
| 类型检查 | **通过**（`pnpm typecheck`，exit 0） |
| 数据库 Migration | **通过**（本地此前已 `migrate deploy` 含最新 ops migration） |
| API 冒烟 | **通过**（`API smoke passed.`） |

命令：

```bash
pnpm typecheck   # EXIT 0
pnpm test:api    # 70 pass / 0 fail
pnpm api:smoke   # API smoke passed.
```

---

## 11. 测试账号与测试数据

- **生成方式：** `pnpm db:seed`（permissions、super admin、dealers、catalog、tax rates、email templates）
- **Seed 命令：** `pnpm db:seed`（需 `.env` 中 `SUPER_ADMIN_*`）
- **角色：** seed 超级管理员（全权限）；客户账号由 register/smoke 动态创建
- **获取凭据：** 使用本地 `.env` 的 `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`（**不要写入本文件**）；Dashboard 登录后可发 service account token

---

## 12. 外部服务

| 服务 | 用途 | 开发环境配置方法 | Mock 情况 | 当前状态 |
|---|---|---|---|---|
| PostgreSQL 16 | 主库 | docker compose | 真实本地 | 已验证 |
| SMTP | 出站邮件 | env 或 Dashboard provider | 可 Mailpit | 代码就绪；真实发送视配置 |
| Canada Post AddressComplete | 地址联想 | `CANADA_POST_API_KEY` | 客户端测有 mock | 缺 key 未实跑 |
| Moneris Checkout | 卡支付 | `MONERIS_*` | 单测 mock | 缺 QA 凭据 |
| ERP Product/API | 目录/订单/客户 | `ERP_*` | 可失败重试 | 依赖可达性 |
| 第一方 Analytics | PV | 无需第三方 | 自建表 | API 就绪；consent e2e 未跑 |

---

## 13. 下一位 agent 的建议接手顺序

1. `git checkout` 本分支 → 确认 `HEAD` ≥ `05ece17` → `docker compose up -d` → migrate/seed → 跑三门禁
2. 读 `SPEC.md` + `DECISIONS.md` + `docs/BACKEND-HANDOFF-2026-07-26.md`
3. 若任务是**生产上线**：停下来要用户授权与密钥，不要自行部署
4. 若任务是**补验证**：Moneris/Canada Post/Dashboard SMTP/Analytics 浏览器 e2e
5. 若任务是**新功能**：先改 `api-contract.ts` + `access.ts` + 测试/smoke，再改 UI
6. 新权限务必更新 `permissions.ts` + seed + `tab-permissions.ts`

---

## 14. 最后可信状态

- **最后修改时间：** 2026-07-26（功能 `3eb35c5` 02:48 CDT；文档 `05ece17` 03:00；本 handoff 表 03:05+）
- **最后成功运行的命令：** `pnpm typecheck`；`pnpm test:api`（70/70）；`pnpm api:smoke`
- **当前可正常工作的功能（本地，已验证）：** health、auth、catalog、cart、checkout（pickup + delivery 带地址）、manual/POS 支付回调与 simulate、订单查询含 statusEvents、account、CRM API、CMS、submissions、consent、smoke 覆盖路径
- **当前不能工作 / 未验证的功能：** 真实 Moneris card；真实 Canada Post；生产 API；ERP 入站库存；Dashboard SMTP/模板/PV 的人工 e2e；促销引擎
- **Git：** 分支 `claude/dealer-neutral-copy-sync-20260721`；功能 `3eb35c5`；文档 `05ece17`；相对 origin **ahead（未 push）**
- **备份：** 以 Git 对象为准；无单独「覆盖删除备份」目录。脏工作树中的 goal-loop 等**不是**功能快照

### 状态用语对照（强制）

| 用语 | 含义 |
| --- | --- |
| 写完了 | 代码在树中 |
| 跑通过了 | 本机门禁或点名测试通过 |
| 根据代码推测应该能工作 | 未跑或无法跑外部依赖 |
| 还没验证 | UI/外部 e2e 未做 |
| 已知失败 | 有复现失败（当前门禁无失败项） |

只有「写完且实际验证通过」才标 **已完成且已验证**。

---

## 15. 不确定事项（假设，非事实）

1. 生产 `api.vanstro.ca` DNS/TLS 现状可能仍未就绪（早期任务书如此描述；**本会话未复核生产 DNS**）。
2. 业务税率表 seed 的各省税率是否被财务最终批准：**未确认**。
3. `DELIVERY_FLAT_FEE_CENTS` 默认 1500 是否为最终运费政策：**未确认**。
4. ERP `vanstro.xin` product API 字段稳定性：**假定**现有 sync 映射仍有效。
5. Moneris Checkout JS URL / QA 环境是否变更：**未向 Moneris 复核**。
6. 支付回调后 `quantityOnHand` 与 ERP 所有权长期规则：代码已扣减；与「ERP 为库存唯一真源」的长期政策是否冲突需产品确认。
7. 工作树其他 agent 的未提交改动可能与本 handoff 并行存在。
8. `pnpm qa:backend` 脚本是否始终存在于 root `package.json`：文档提到；门禁以三条独立命令为准。
9. OpenAPI 文件与运行时代码差异程度：**未在本轮 diff**。
10. fr-CA 全站文案与支付错误码覆盖是否 100%：**假定**主要路径已有 copy，未做全量 i18n 审计。
