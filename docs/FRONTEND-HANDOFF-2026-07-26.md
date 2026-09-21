---
title: VanStro 前端交接（全站 EN / fr-CA）
date: 2026-07-26
status: frontend-complete-backend-pending
owner: frontend
next-owner: backend-agent
---

# VanStro 前端交接

## 1. 一句话状态

EN/fr-CA 静态前端、全站路由、产品本地化、SEO、响应式和当前浏览器矩阵已完成并上线；生产 API、数据库 migrations、Worker、支付/ERP 和真实账户/交易链路仍由后端接手。

后端任务书：

`docs/FRONTEND-TO-BACKEND-HANDOFF-REQUEST.md`

## 2. 当前线上版本

- 生产站：`https://vanstro.ca/`
- 法语站：`https://vanstro.ca/fr/`
- 当前 release：`/www/wwwroot/vanstro.ca/releases/75fad0bf950a-careers-footer1`
- 回滚 release：`/www/wwwroot/vanstro.ca/releases/75fad0bf950a-frca-full1`
- 发布文件：4,491
- 当前发布包 SHA-256：`4a0e36cdaac69267edba0c31250d6f82ab441cd325e349a873c9ba3c7e58736a`
- 当前 release 完整性：4,491/4,491 SHA-256 一致

最后一项线上修改：Footer Company/Entreprise 分组将重复的 Privacy Policy 替换为 Careers/Carrières；底部法律链接继续保留 Privacy Policy。

## 3. 前端完成范围

### 路由与静态导出

- 332 个应用路由
- 338 个静态页面产物
- 23 组固定 EN/fr-CA route pairs
- 3 组动态 route families：products、articles、orders
- 166 个法语 HTML
- 140 个 PDP/locale
- 308 个可索引 sitemap URL
- EN/fr-CA 独立 404 与 static-host fallback

主要页面：

- 首页、Products、140 PDP
- Resource Center、3 篇文章详情
- About、Contact、Careers
- Dealer Program、Dealer Apply、Dealer Map
- Login/Register、Favorites、Cart、Checkout、Order Detail、Dashboard
- Cookie Settings、Legal/Privacy/Terms/Return/Responsibility
- EN/fr-CA 404

### i18n

核心目录：

- `src/app/fr/`
- `src/lib/i18n/`
- `src/components/i18n/`
- `src/lib/product/product-localization.ts`

机制：

- URL locale 前缀：英文无前缀，法语 `/fr`
- `LocaleBoundary` + `LocaleProvider`
- `localeHref()` / `alternateLocaleHref()` 保持 path/query/hash
- 静态 export 后 `scripts/localize-static-html.mjs` 确保 `/fr/**/*.html` 的 `lang="fr-CA"`、canonical、hreflang、OG locale 和 robots
- EN/fr-CA error code 映射：`src/lib/i18n/api-error-localization.ts`
- fr-CA 价格/尺寸/公制：`src/lib/i18n/display-format.ts`

不要恢复旧 `/zh` 路由。不要把 `Accept-Language` 自动重定向加入静态站。

### 产品本地化

- 140/140 产品父项
- 294/294 variants
- SKU/UGS、MPN、ID、slug、taxonomy key、价格、库存、图片 URL 和图库顺序保持不变
- Vanity configuration 使用稳定 `configuration` 属性，不解析翻译后的 display text
- Trim/Baseboard/Casing/Handle 技术说明、尺寸、FAQ、文件标签、图片 alt 已法语化
- 价格：例如 `302,00 $`
- 尺寸：例如 `12 po L × 34,5 po H × 24 po P`

验证器：

- `scripts/verify-product-localization.mts`
- `scripts/verify-p0-product-fixes.mts`
- `scripts/verify-fr-ca-display-format.mts`

### SEO

- self-canonical
- reciprocal `en-CA`, `fr-CA`, `x-default`
- 法语 OG locale / content-language
- EN/FR 404 noindex
- 308 个 sitemap URL，140 PDP/locale
- 产品 JSON-LD 保留 SKU/价格/availability，名称和描述随 locale

### Consent、隐私和第三方客服

- Cookie preferences first-party local storage
- canonical consent payload 与 action：granted/updated/withdrawn
- `StorefrontProvider` 是 optional storefront storage 的唯一 owner
- functional consent 撤回后清理 first-party optional storage
- Tiledesk 未授权不加载；撤回时 host-side script/iframe/global teardown；跨域 vendor storage 属外部边界
- 法语法律内容是信息性翻译，页面继续显示待加拿大/Québec 法律审核声明

### 前端真实 API 接入

以下前端已经调用 API，不是纯视觉 placeholder：

- `CustomerSessionProvider`：`/auth/me`, `/auth/logout`
- Login/Register：`/auth/login`, `/auth/customer/register`
- Cart：`/cart`, `/cart/items`
- Favorites：`/account/favorites`
- Checkout：`/checkout/session`
- Order：`/orders/:id`, `/orders/:id/status`
- Contact：`/contact/leads`
- Dealer application：`/dealer-applications`
- Product reviews：`/products/:identifier/reviews`
- Consent：`/privacy/consent-events`

API 不可用时部分服务端 catalog read 会 fallback 到 mock；交易写入不会伪造成功。

## 4. 前端架构

### App providers

`src/app/layout.tsx`：

```text
LocaleBoundary
  CustomerSessionProvider
    StorefrontProvider
      AppChrome
      CookieBar
      CookiePreferenceDrawer
```

### 关键组件

- Header/Footer：`src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx`
- Storefront state：`src/components/storefront/StorefrontProvider.tsx`
- Auth session：`src/components/account/CustomerSessionProvider.tsx`
- Products：`src/components/product/`
- Cart/Checkout/Order：`src/components/checkout/`
- Dashboard：`src/components/dashboard/DashboardShell.tsx`
- Forms：`src/components/forms/PublicSubmissionForm.tsx`
- Dealer map：`src/components/dealer/DealerMapLocator.tsx`
- Support：`CustomerSupportWidget.tsx`, `FloatingSupportWidget.tsx`

### 数据层

- `src/lib/api/api-contract.ts`
- `src/lib/api/dashboard-contract.ts`
- `src/lib/api/api-client.ts`
- `src/lib/api/runtime-validation.ts`
- `src/lib/api/server.ts`
- `src/lib/data/mock-data.ts`

后端替换 mock 时，优先在 `server.ts` 或 API wrapper 层切换，不要让 page/component 直接拼接 raw URL。

## 5. 当前 QA 基线

聚合命令：

```bash
NEXT_PUBLIC_SITE_URL=https://vanstro.ca pnpm run qa:ci
```

最后一次完整结果：PASS。

包含：

- full monorepo typecheck
- SEO/security
- API tests 20/20
- functional consent storage
- final transactional review
- product P0 / identifier invariants
- package contracts 5/5
- runtime error localization
- fr-CA display formatting
- static build
- SEO artifacts
- 166 HTML visible text/ARIA/metadata scan
- EN/FR 404 artifact + HTTP fallback
- careers/contact privacy alignment
- Chromium desktop/mobile 36/36
- `git diff --check`

浏览器报告：`tmp/browser-qa/report.json`。它只代表 Chromium/CDP，不代表 Safari、Firefox、screen reader 或真实生产 API。

## 6. 静态部署规则

生产静态站使用 immutable release + site-root switch：

- 脚本：`scripts/deploy-bt-static.py`
- 配置：`.env.bt.local`（严禁输出 secrets）
- 每次创建全新 release，禁止覆盖旧 release
- 切换后逐文件 HTTP SHA-256 验证
- 验证失败自动回滚站点 root

当前工作树有大量 untracked 必需源码，因此标准 `--include-tracked-worktree` 不会完整包含当前状态。之前 Footer 发布直接使用已验证的完整 `out/` 创建新 release。后续应先整理为 clean committed snapshot，再从 clean checkout 构建发布。

## 7. 当前仓库保护状态

这是关键风险：

- 当前约 102 个 modified tracked 文件
- 约 151 个 untracked 路径（Git status 展开后 docs evidence 条目更多）
- 分支领先 upstream 1 commit
- `stash@{0}` 必须保留

禁止：

- `git clean`
- `git reset --hard`
- `git restore` 批量回退
- stash apply/pop/drop
- 批量 `git add .`
- 把整个 dirty diff 视为单一前端 patch

后续应按 frontend、API、DB migrations、Worker、QA/CI、docs 分组审查和纳入 intended commits。

## 8. 已知生产边界

### API/DNS

`api.vanstro.ca` 当前无 A/AAAA 解析。因此线上静态页面可浏览，但运行时 API 请求失败：

- 登录/注册
- 收藏
- cart/checkout/order
- Contact/Dealer/Review
- Consent server audit
- Dashboard

### 数据库/Worker

尚无生产证据：

- 4 个 2026-07-25 migrations 已应用
- Worker 常驻运行
- consent 24 个月 retention job
- inventory reservation expiry
- SMTP/ERP queue

### 业务/法律

仍需确认：

- tax 规则（当前后端临时 5%）
- delivery fee（当前临时 CAD 15）
- payment provider 和 payment method
- 电话 `204-505-2288` vs `204-221-2288`
- 地址 `Century St` vs `Century Street`
- Qingdao Wanshituo 关系/数据角色
- applicant retention
- Tiledesk vendor storage/retention
- 加拿大/Québec 法律审核

## 9. 后端接入时前端不能被破坏的契约

1. API base path 必须是 `/api/v1`。
2. 保留 `{data,meta?}` 与 `{error,code,fields?}`。
3. Cart token 通过 `meta.cartToken` 返回，客户端使用 `X-Cart-Token`。
4. `POST /checkout/session` 必须返回 `guestOrderToken`。
5. 订单 guest access 使用 token；禁止公开 ID 即可读取。
6. Product lookup 必须支持 slug；写操作使用内部 ID。
7. 错误 code 必须稳定并同步 EN/fr-CA mapping。
8. Product identifiers、SKU、variant identity 不得改变。
9. locale 字段必须保留 `en-CA` / `fr-CA`。
10. Contact/Dealer rawPayload 不得复制 PII。
11. Consent preferences 只能持久化 canonical 四个字段。
12. CORS 必须允许 Authorization、Content-Type、Accept、X-Cart-Token。
13. Dashboard permission ceiling 和 audit log 不得绕过。

## 10. 推荐后续前端任务

后端可用后，前端 agent 按顺序执行：

1. 在 production-like 环境设置 `NEXT_PUBLIC_API_BASE_URL`；
2. 跑 auth/cart/checkout/order/contact/dealer/review/consent 实际 round-trip；
3. 移除或收紧 `server.ts` 对生产 API 失败的 mock fallback；
4. 将静态 catalog/content 改为构建时 API/CMS published reads；
5. 补 Dashboard 全功能 UI；
6. 用 Safari/Firefox 与 screen reader 做额外验证；
7. 在 clean checkout 重跑 `qa:ci`；
8. 用 immutable release 发布并完成线上 API/browser smoke。

## 11. 交接入口

后端 agent 首先阅读：

1. `docs/FRONTEND-TO-BACKEND-HANDOFF-REQUEST.md`
2. `docs/API-CONTRACT-ALIGNMENT.md`
3. `src/lib/api/api-contract.ts`
4. `src/lib/api/api-client.ts`
5. `apps/api/src/app.ts`
6. `packages/db/prisma/schema.prisma`
7. `apps/worker/src/index.ts`

前端后续 agent 首先阅读本文件，再读项目工作区：

- `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/handoff.md`
- `tasks/checkpoints/cp96-fr-ca-full-local-source-pass.md`
- `tasks/checkpoints/cp98-local-vs-production-sync-audit.md`
- `tasks/checkpoints/cp99-careers-footer-deployed.md`
