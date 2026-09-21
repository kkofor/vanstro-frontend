# VanStro v1.0 CG01 增量 — Domain Settings Port 契约（人读）

Date: 2026-08-05（Wave A）/ 2026-08-07（Wave B Commerce 增量）/ 2026-08-07（Wave C API / Service Account 增量）
Status: **FROZEN_CONTRACT_ONLY — S08 NOT STARTED**（S03 已实现状态由其独立契约记录）
Previous Commerce tranche status anchor: `FROZEN_CONTRACT_ONLY — S03 IMPLEMENTED（认证中，闭包后由 S03 契约记录）`。
Gate: `CG01`（不计数 contract gate）
Batch: `wave-a-plus-wave-b-commerce-plus-wave-c-api-service-account`
Canonical JSON: `tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json`（本文件为其人读正文，语义与 JSON 一致并由 static test 证明）

## 0. Baseline identity

- baselineCommit: `b3d59b31b7149c3458033dc0b072a0164dd7b7c7`
- baselineTree: `6a52e53a00c9b02a75a05a67cbf21efd3f9edbca`
- 现场只读核验：`git rev-parse HEAD` / `HEAD^{tree}` 于 `integration/fullstack` worktree，与提示词报告一致。

## 1. S01 继承契约（引用，不复制）

- `settings-center.v1` 与当前 registry group vocabulary；
- S01 九态生命周期；
- resource-local draft CAS；
- descriptor 级单调 publication sequence；
- append-only history 与原 publish Audit identity 不变；
- idempotency exact replay/conflict；
- not-found/version/state conflict 分离；
- safe integer/UUID 边界；
- rollback 创建新 draft/new publication，不改历史；
- publish/Audit/ledger/history 原子；
- 真实 P02 authority snapshot；
- consumer-generation readiness，missing/mismatch degraded；
- global `settings.read/settings.write` 正常功能权限；
- `partialPublish=false`；
- secret 永不回显；
- 外部副作用默认 false。

CG01 不把 Port 或 future group 改成 `available`，不新增 `contract_frozen` runtime availability。

## 2. Port A — `cg01.general-storefront.v1`（未来 S02）

### 2.1 schema

逻辑字段族（均为 future settings 值或 ID/reference，无存储实现）：

- general identity/contact/timezone（siteDisplayName、legalName、canonicalUrl、contactEmail/Phone/Address、defaultTimezone）— `future_setting`；
- brand（brandName/Description、logo/favicon/emailLogo/socialShare Media ref、colors、font）— `future_setting`；
- storefront（home/navigation/footer ref、defaultProductSort、outOfStock、dealerSelection、cart/checkout、announcement/maintenance banner 展示规则、storefrontConfigRef、en/fr routes）— `future_setting`；
- localization（defaultLocale、supportedLocales、dashboardLocale、currency、timezone、date/phone/address format、weight/dimension units、translationFallback、province/service mapping）— `future_setting`；
- default Dealer/Location ref — `future_setting`。

引用规则：Media/CMS/Dealer 只存 id 引用；Settings 永不复制 Asset/Variant/Usage、CMS 正文或 Dealer/Location 实体。

### 2.2 currentProjection（source facts）

| path | anchor | blobOid | classification | owner |
|---|---|---|---|---|
| `apps/api/src/dashboard/cms.ts` | SiteContentModule/navigation/home-page/footer/articles routes | `72301128d3e241968333a98e66b7abd7269eed7c` | current_fact | CMS/D11 |
| `apps/api/src/dashboard/media.ts` | media asset/variant/usage routes | `e13b9d9f566d14d336882807b4aaca91ae370ba6` | current_fact | Media/P07 |
| `apps/api/src/dashboard/dealers.ts` | dealer/location routes | `3b3f634cc6ec17352c20293f3b18a1952f6002d7` | current_fact | Dealer/Location/D10 |
| `apps/api/src/dashboard/foundation.ts` | Dashboard Shell/Foundation（`DASHBOARD_FOUNDATION_MODULES` / `dashboardShellConfig` / `DASHBOARD_SHELL_FLAG_KEY` = `dashboard.shell.v2` / `projectDashboardModules`）——不是 storefront config source | `c2695bdd9945c92a8b89d715851b43e4995ba2f5` | current_fact | Dashboard Shell/Foundation |
| `apps/api/src/dashboard/modules.ts` | module readiness（`/dashboard/modules/readiness` + `MODULE_KEY_MAP`） | `2d3003ab75f3e1c10e8a31e5e76ca70016ef72d1` | current_fact | Dashboard modules readiness |
| `apps/api/src/dashboard/modules.ts` | storefront config current projection：`storefront_config` moduleKey + `/dashboard/storefront/config` read/write adapter（Pattern B raw JSON；S02 parity 未实现） | `2d3003ab75f3e1c10e8a31e5e76ca70016ef72d1` | current_fact | Storefront Runtime Config/D16 |

缺口：site identity 无单一事实源；default Dealer/Location 无当前事实；storefront mock/current-source 差异；fr-CA fallback 为编译行为。storefront config 的当前 source 是 `SiteContentModule` raw JSON（Pattern B），S02 parity 与 Settings 强生命周期接线尚未实现。

### 2.3 draftValidator

复用 S01 structural/business invalid 分层；locale 合法、media/CMS/dealer ref 存在（缺失 → blocker）；locale 缺失 → warning；unknown field reject；错误族继承 S01。

### 2.4 publishAdapter

publish 只激活 policy/scalar/id-reference 版本；publish/Audit/ledger/history 原子；Storefront 读 published settings 解析引用；禁止 upsert CMS/Media/Dealer、禁止复制第二真源；missing reference/locale → degraded/fallback；old CMS/storefront payload 保留到 S02 parity。

### 2.5 readinessAdapter

无副作用；consumer-generation match 继承 S01；missing/mismatch degraded；missing ref/locale/domain dependency → degraded；绝不 fake-ready。

### 2.6 auditDescriptor

operation family `settings.publish/rollback (S02)`；resource family `settings.core / settings.general-storefront`；required permission 现有 `settings.write`；真实 P02 occurrence-time snapshot；safe metadata 为 descriptorKey/version/ref ids/changeReason；secret denylist 含 media bytes、CMS content、Dealer/Location PII；retention 继承 P04。

### 2.7 边界

不在范围：CMS structured publication（B08）、Media/storage provider（S11/v3）、Dealer 管理（B06）、多站点/多币种（v3）、UI/route/descriptor/migration。

## 3. Port B — `cg01.auth-rbac.v1`（未来 S09）

### 3.1 schema

- password policy（minLength、hashAlgorithm、iterations、reusePolicy）— `future_setting`；
- session lifetime/refresh/revoke policy — `future_setting`；
- deployment cookie/status 只读 projection（cookieName/flags/secretStatus）— `immutable_projection`（secret，不可编辑）；
- Role/Permission impact preview 配置与引用 — `future_setting`；
- User/Role/Permission 本体永远不是 Settings 值。

### 3.2 currentProjection

| path | anchor | blobOid | classification | owner |
|---|---|---|---|---|
| `apps/api/src/auth/session.ts` | `SESSION_TTL_MS = 7 days`、cookie names | `fee78dbf199baaf94e738cca210c1ff78edac288` | current_fact | Auth/A05 |
| `packages/db/src/password.ts` | `pbkdf2_sha256`、310000 iterations、32-byte | （见 JSON） | current_fact | Auth/A05 |
| `apps/api/src/dashboard/access.ts` | `settings.read/settings.write/sessions.revoke` | `0efd8e8d2cdd8dfc7d21e415de41f88ffba1957c` | current_fact | P02 RBAC |
| `apps/api/src/dashboard/authorization.ts` | p02 context / permission ceiling | `1d15351e3593b5f02512426f299ac9a58f1b435e` | current_fact | P02 RBAC |

当前不一致如实记录（TTL 来源不一致），CG01 不改代码。

### 3.3 draftValidator

minLength ≥ 当前下限、TTL 在安全界内、last-admin guard 必需；TTL 不一致 → blocker；unknown field reject。

### 3.4 publishAdapter

policy 只影响未来适用点；不创建/伪造 session、不自动修改 Role/Permission；existing session 默认不追溯；session revoke 仍是独立显式业务动作，不是 settings rollback；v1 继续使用既有 `settings.read/settings.write`。

### 3.5 readinessAdapter

无副作用；consumer-generation match；P02 context unavailable / TTL 冲突 / dependency unavailable → degraded；绝不 fake-ready。

### 3.6 auditDescriptor

operation `settings.publish/rollback (S09)`；resource `settings.core / settings.auth-rbac`；required permission 现有 `settings.write`；真实 P02 snapshot；secret denylist 含 cookie secret、DB credential、encryption key、password hash。

### 3.7 边界

不在范围：MFA/SSO/passkey/WebAuthn/SCIM、Auth/ACL/provenance v2 治理、password hash 算法迁移、新 permission/descriptor/route/migration/session 动作。RBAC shared-contract 写租约仅 S09。

## 4. Port C — `cg01.privacy-retention.v1`（未来 S10）

### 4.1 schema

- consent category/policy（anonymous/authenticated 分开）— `future_setting`；
- retention policy（按对象族 duration/action）— `future_setting`；
- legal hold policy/reference — `future_setting`；
- DSAR access/export/delete 流程规则 — `future_setting`；
- PII display policy — `future_setting`；
- low-risk execution allowlist、impact preview/readiness/audit 配置 — `future_setting`。

authority 分层：anonymous consent = current_fact；authenticated consent / `privacy.subject.purge` / principal-capacity = SQL authority object 存在（current_fact），但 TS producer/consumer/worker 路径缺失、product_execution = future_unavailable，只能进入 currentGaps 与 future obligations，不得进入当前执行 allowlist。

### 4.2 currentProjection

| path | anchor | blobOid | classification | owner |
|---|---|---|---|---|
| `apps/api/src/routes/privacy.ts` | `POST /privacy/consent-events` anonymous | `2cf0002790edab7526d8bfcd0653bf2128fefd08` | current_fact | Privacy/D17 |
| `packages/db/src/privacy-retention.ts` | `CONSENT_RECORD_RETENTION_MONTHS=24` | `4f5d2ccb3a362250c7cf1d32c7692d9297ef9792` | current_fact | Retention |
| `packages/db/src/data-retention.ts` | `DATA_RETENTION_DAYS` | `4c5cabcc30db6dc9b8bcffff87f1b1c713ea4115` | current_fact | Retention |
| `apps/worker/src/index.ts` | `apply-data-retention` job | `d0e5f9792eaf922c7a9435129230e8e6568c68b8` | current_fact | Retention |
| `packages/db/prisma/schema.prisma` | `privacy_consent_events`、media `legalHold` boolean | `7078a1344490c29a564f5ba5c3f10b60b4770ab0` | current_fact | Privacy/D17 |
| `apps/api/src/audit/query.ts` | `audit-retention.v1`/`expiresAt` | `af8be646c83264ad41be3f4e925501c72a94654e` | current_fact | P04 |

缺口：Audit/async-job expiry 无 cleanup consumer 或计划 job type（`implementation_decision_required`，S10 开始前必须闭合）；legal hold 无管理写方；low-risk registry/impact preview/privacy job/readiness 不存在。

### 4.3 draftValidator

retention duration 有界；legal-hold ref 存在；low-risk allowlist 仅限显式列出对象；hold conflict / Job unavailable / consumer missing → blocker；unknown field reject。

### 4.4 publishAdapter

policy publish 不执行删除/匿名化/归档/purge；只有未来明确列入低风险 allowlist 并经独立业务动作/Job 授权的对象才可执行；Orders/Payment/Audit/Media legal-hold 高风险删除不自动执行；real delete/purge 继续需要用户单独授权；policy rollback 只创建新 policy 版本，不恢复已删除/匿名化数据；B09 消费 S10 published policy，方向 S10→B09，S10 不等待 B09。

### 4.5 readinessAdapter

无副作用；hold conflict / Job unavailable / consumer missing / P04 dependency unavailable → degraded/blocked；绝不 fake-ready。

### 4.6 auditDescriptor

operation `settings.publish/rollback (S10)`；resource `settings.core / settings.privacy-retention`；required permission 现有 `settings.write`；真实 P02 snapshot；secret denylist 含 PII、consent payload、删除/匿名化目标；retention 继承 P04，irreversibility 记录。

### 4.7 边界

不在范围：S10/B09 实现、自动高风险删除、P04 provenance/ACL 治理、privacy_consent 前端 Audit 筛选、expiresAt cleanup 质量修复、新 job/descriptor/route/migration。Privacy/Audit shared-contract 写租约仅 S10。

## 5. Port D — `cg01.commerce.v1`（未来 S03）

本 Port 为现有 CG01 的 Wave B 增量，不增加工作包、节点、边或进度。consumer=`S03`；domain owners=Commerce、Tax、Shipping/Fulfillment、Inventory、Orders。

### 5.0 当前事实基线与 ERP 唯一 Authority

- current-fact baseline（S03 消费后）：`f8f1b1b74db9b2ba0d67a015c72f0fc9a1da5fee` / tree `f8e68c6ab58af7c6c957be082ee00830e7e58ae1`；S03 消费的 commerce 路由、共享 API contract、runtime validation 三个 blob OID 按新基线重新绑定，旧三 Port 与其余 product 事实保留 87bd809 历史 OID；迁移边界 forward 至 migration78（S03 专属，无 79），migrations 1-77 相对 S10 权威 87bd809 保持不可变。
- ERP Priority Overlay：`/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-erp-product-api-priority-overlay.md`，SHA-256 `a8ca3113984b7e4f76b675009b64f8e22c705095873e4b315d6613bc7c7d2f89`。
- ERP Compatibility Contract：MD `d2dbe952b60d5fa76ef5b50ef742fa859e1ecf8ca87d582370879f8c874ed18d`、JSON `3998fdf8c3a4ea4ba738da885ad2ae7a9840fadfb3eab5da16ac0c7c5717cffa`；Manifest `bad24bbf6e30e97e40c19de4e4718422fe624321399712b3e0b06c17cdfb1dcb`。
- Manifest 必须保持 `planningFrozen=true`、`productContractFrozen=false`、`currentProgressContribution=0`。
- ERP 字段 Authority：ERP 唯一拥有 ERP product ID、SKU/Variant 外部 ID、基础商品名称、Category 源编码、库存、成本、基础售价；VanStro 唯一拥有 Media、SEO、营销文案、Storefront 发布状态、营销折扣；sellableStatus 为组合字段。
- push/pull 只是传输方向，必须共用一个 canonical ingest、mapping、幂等 ledger、逐项回执、版本/replay/conflict/stale/loop 防护；S03 只引用该 Authority，不复制字段 ownership。
- 旧 `docs/erp-adapter-contract.md`（blob `c60e55f2e318b68db38d073d4e552717a0b80921`）和 `docs/erp-catalog-sku-api.md`（blob `00832e5a165dd93308b9d18aca2b90a67647a60d`）的“VanStro 拥有商品主数据/网站价格”假设已被前向覆盖，只作为历史冲突证据。

### 5.1 schema

顶层 exact typed families（均 required、unknown key reject、禁止万能 JSON）：

- `commercePolicy`：`minimumOrderAmountCents`（非负 safe integer CAD cents）、`guestCheckoutEnabled`、`checkoutEnabled`；均为 `future_setting`。
- `taxPolicy`：`enabledProvinceCodes`（唯一加拿大省码数组）、`calculationMode=current-tax-rate-table|disabled`、`roundingMode=nearest-cent`；来自 TaxRate 当前事实。
- `shippingPolicy`：`pickupEnabled`、`deliveryEnabled`、`deliveryFlatFeeCents`、`serviceZoneMode=dealer-location-only|postal-prefix`、`fallbackMode=reject|pickup-only`。
- `inventoryPolicy`：`reservationEnabled`、有界 `reservationTtlMinutes`、`availabilityMode=manual|erp`、有界 `staleAfterSeconds`、`staleBehavior=degraded-reject|manual-fallback`。
- `orderPolicy`：`allowedLifecycleTransitions`（仅 paid/processing/fulfilled/cancelled）、`guestLookupEnabled`、`cancellationMode=erp-confirmed-only|disabled`。

Cart、PaymentSession、Order、InventoryReservation、TaxRate、ERP mapping/job/webhook 行仍是领域实例，永远不是 Settings 值。

### 5.2 currentProjection（source facts）

| path | anchor | blobOid | classification | owner / gap |
|---|---|---|---|---|
| `apps/api/src/routes/commerce/index.ts` | cart/checkout/tax/fulfillment/reservation/inventory/order + ERP webhook 边界 | `af0a5cdaf3f5ad65fe64c7acef7bf51946cebc51` | current_fact | Commerce；minimum order 缺失、checkout 不校验 service zone |
| `apps/api/src/config.ts` | inventorySourceMode；snapshot TTL 默认 5m；delivery flat fee 默认 1500 cents | `96bb8ca04406635e39f40a39d8e1e5567b390ec0` | compiled_default | Commerce runtime config；尚非 Settings policy |
| `packages/db/prisma/schema.prisma` | Cart/PaymentSession/Order/TaxRate/InventorySnapshot/Reservation/ProductSkuErpMapping/ERP jobs/webhooks | `7078a1344490c29a564f5ba5c3f10b60b4770ab0` | current_fact | DB/Commerce；实例不复制进 Settings |
| `src/lib/api/api-contract.ts` | FulfillmentType/CheckoutSession/CommerceOrder/ProductInventory | `2524c548147f2674c844cb912dfe836c7e8ed6ed` | current_fact | shared API；S03 DTO/descriptor 不存在 |
| `src/lib/api/runtime-validation.ts` | CheckoutSession/Commerce DTO validators | `efc4b2c559b4908a4edbd21d1f4708699f2f3d17` | current_fact | shared validator；S03 validator 不存在 |
| `apps/worker/src/index.ts` | expired reservation release、ERP push/recover/catalog handlers | `d0e5f9792eaf922c7a9435129230e8e6568c68b8` | current_fact | Worker；不是 S03 consumer |
| `apps/api/src/routes/erp-integration.ts` | catalog/skus、upstream proxy、catalog/sync、machine audit | `03675fbff447aa2985ea6df18f2a12ec92b19cbe` | current_fact | ERP；batch write/dry-run/canonical ingest 未完成 |
| `apps/api/src/routes/catalog.ts` | dealer service-area projection | `517ec83303497256151860b1fa971aaa9f2825d2` | current_fact | Catalog；service zone 仅展示、不进 checkout |
| `apps/api/src/payments/finalize.ts` | order creation/reservation consume/ERP+email enqueue | `281a3628172b9bd85c3ef2e438063266cf840491` | current_fact / not-in-scope | Payment；S03 preview/publish/rollback 禁止调用 |
| `apps/api/src/integrations/erp-sync/inventory.ts` | reservation consume/release/restock | `213c0a2ee1739c8a88dfa77c05bbec806cec6019` | current_fact | Inventory execution；非 Settings publish |
| `apps/api/src/integrations/erp-catalog-sync/service.ts` | current ERP catalog pull/upsert | `ee8722ee98b069bddcf11a26728c8bc91910888a` | current_fact | 未走 P08/P05 canonical ingest/逐项回执 |
| `apps/api/src/routes/checkout-totals.test.ts` | availability、MB/ON 税、pickup/delivery totals 事实证据 | `d8b523aed222e917604b0dd6fc028e5a08a309f3` | current_fact（test evidence） | 不等于 runtime policy |

当前事实：Cart CAD-only、quantity 1–999；TaxRate 按省/effectiveFrom 读取且缺失 fail-closed；pickup/delivery 由 active DealerLocation capability 决定；ERP mode snapshot 超过 TTL 返回 `INVENTORY_REFRESHING`；reservation 使用条件 UPDATE 防超卖并有 active/released/consumed/expired；Order 仅 paid→processing/fulfilled/cancelled、processing→fulfilled/cancelled；Payment finalization 强耦合但明确不在本 Port 执行范围。

current gaps：minimum order 不存在；service zone 未进入 checkout；S03 runtime descriptor/route/DTO/validator/UI/consumer 不存在；ERP push/pull 尚未共享 canonical ingest/mapping/idempotency/per-item receipt；ERP v1 bounded batch write/dry-run/old-client gate 未完成；ERP webhook timestamp/replay-window 缺失。

### 5.3 draftValidator

复用 S01 structural/business invalid 分层；exact typed keys、unknown field reject。以下为 blocker：负数/unsafe minimum order 或 fee、未知/重复省码、非法 tax mode/rate-table dependency、delivery 无合法 fulfillment/service-zone mode、非法 Order transition、非法 reservation TTL/stale policy、ERP 字段 Authority 越界。ERP stale、ERP/Tax/Shipping dependency unavailable、missing future consumer 为 warning/degraded，不能 fake-ready。

### 5.4 publishAdapter

publish 只激活 typed Commerce policy version；publish/Audit/ledger/history 原子，`partialPublish=false`。未来 checkout/tax/shipping/inventory/order consumer 只读 published policy；B02/B04/B05 消费该规则，S03 不等待它们。禁止：Cart/Order/Payment 创建或修改、库存 reservation/lock/decrement/release、真实税务结算/报税/provider、shipment/carrier/Canada Post、ERP sync/Job/connector、Product/SKU/Price/Category 写入。rollback 仅新 policy draft/publication，不反向执行业务动作。

### 5.5 readinessAdapter

完全无副作用；ready 要求 published generation 与 consumer generation 精确匹配。missing S03 consumer、ERP stale/unavailable、Tax table、Shipping/service-zone、Inventory dependency unavailable、generation missing/mismatch 均为 degraded；绝不 fake-ready。

### 5.6 auditDescriptor

future operation `settings.publish/rollback (S03)`；resource `settings.core / settings.commerce`；只复用现有 `settings.write`；真实 P02 occurrence-time snapshot。safe metadata 仅 descriptorKey、policy version/sequence、changeReason、安全 rule-family id。denylist：customer/PII/contact/address、payment material/provider payload、Order sensitive values/items、inventory quantity/detail、ERP credential/token/full payload、tax filing data。retention 继承 P04。

### 5.7 obligations、租约与验收边界

Future obligations：typed S03 lifecycle；exact-generation consumer；read-only calculate/quote/impact preview；ERP v1 additive compatibility；push/pull 共用 canonical ingest/mapping/idempotency/per-item receipt；same-source same-version replay、same-key different-payload conflict、stale reject、loop prevention；后续每包持续验证 Compatibility Manifest。

职责：S03=Commerce policy；S08=machine credential；S06=connector/mapping/dry-run/pause/readiness；B01=正式 Catalog；F03=P08/P05 低风险批量管线；RC01=兼容/迁移/备份/rollback 演练。禁止新建第二套 Product 表、Token、ERP 页面、Job、字段 Authority 或幂等体系。

Shared lease：Commerce/Tax/Shipping/Inventory/Orders shared-contract 未来写租约仅 S03；S04 只拥有 Payment Settings；S07/B04/B05 只消费已冻结边界；shared API contract/runtime validator/Dashboard access/Settings registry 由 Integration 单写协调。

Migration：当前 77，latest `20260807000000_s10_privacy_retention_settings`；1–77 不可变；CG01 禁止 migration78；未来 S03 Goal 只有证明需要物理 schema 时才可单独授权 migration78。

Acceptance outline：normal=projection→typed draft→read-only preview→policy-only publish→exact generation ready/诚实 degraded→append-only history；failure=非法 rate/zone/transition/reservation/ownership、stale/unavailable、409/validation、preview 零写入/无敏感回显；rollback=新 draft/publication、历史与原 Audit 保留、零业务反向动作。

## 6. Port E — `cg01.api-service-account.v1`（未来 S08）

本 Port 是现有 CG01 的 Wave C 增量，不增加工作包、节点、边或进度。consumer=`S08`；domain owners=Service Accounts、Machine Authentication、P02 RBAC、P04 Audit、P09 Runtime/Readiness。

### 6.0 当前事实基线与安全 Authority

- current-fact baseline：`d223303c53750db1217eb122f50e204c8d26f88f` / tree `fe8b3526608621e7ff80d6df4d9552706e4f2692`；source facts 均逐 blob OID 绑定该起点字节。
- 现有 token：`vsa_` + 32-byte random base64url；DB 仅存 SHA-256 `tokenHash`；默认 90 天、硬上限 365 天；认证检查 active/revoked/expiry 并更新 `lastUsedAt`；生命周期用 row lock。
- 一次显示、二次读取无明文是不可配置的 immutable security invariant / immutable projection；`oneTimeRevealEnabled` 不是 Settings 字段，draft/publish/rollback 均不能关闭或覆盖。
- ServiceAccount、ServiceAccountRole、ServiceAccountToken、Role、Permission、McpToolInvocation、AuditLog 实例、tokenHash 与明文凭据永远不是 Settings 值。

### 6.1 schema

顶层 exact typed families（required，unknown key reject，禁止万能 JSON）：

- `tokenLifecyclePolicy`：`defaultTtlDays`、`maximumTtlDays`、`requireExpiry`；`rotationOverlapMinutes` 与 `maximumActiveTokensPerAccount` 仅 future obligation，当前无操作/consumer。
- `machineScopePolicy`：Role/Permission allowlist、environment、dealer/location scope、deny-sensitive；均只存策略/引用，不复制实例；environment/scope 当前无字段或 consumer。
- `rateLimitPolicy`：requests/minute、burst、per-token/per-account、Retry-After；当前无 Service Account 专属 rate-limit，实现前不得 current/ready。
- `auditInvocationPolicy`：retention、redaction、last-used、failed-auth audit；引用 P04/P09 当前事实，不复制 Audit/Invocation 实例。
- immutable projections：API base URL、`vsa_` prefix、Bearer scheme、deployment status、只含占位符的 curl 模板；永不含真实 Token。

### 6.2 currentProjection（source facts）

| path | anchor | blobOid | classification | owner / gap |
|---|---|---|---|---|
| `apps/api/src/auth/service-account.ts` | token create/hash/auth/row lock；90/365 天；active/revoked/expiry/lastUsedAt | `f42e0b752f94e0de86c681c543fa7e812025b5a2` | current_fact | Machine Authentication；无 rotate overlap/scope/rate-limit |
| `apps/api/src/auth/service-account-access.ts` | `requireMachineAccess` / `requireMachinePermission` / `writeMachineAudit` | `aad5e74464fe3b982b3308794b93060bd32099d0` | current_fact | Machine Access / P04 Audit |
| `packages/db/prisma/schema.prisma` | ServiceAccount/Role/Token/McpToolInvocation/AuditLog | `7078a1344490c29a564f5ba5c3f10b60b4770ab0` | current_fact | DB instances；绝不复制进 Settings |
| `apps/api/src/dashboard/system.ts` | list/create/update/disable SA；token create 一次明文；revoke；invocations | `415ee1e97d3b9c8a0b81e7add74382b8f97d02fa` | current_fact | 显式业务动作；publish 不调用 |
| `packages/db/src/permissions.ts` | `service_accounts.manage`、ERP/CLI machine permissions 与 role manifest | `c70f7404df7c8f28d58a42d2f8e5380176d6e7ba` | current_fact | P02 RBAC |
| `apps/api/src/dashboard/permission-ceiling.ts` | assign/manage Service Account 的 actor permission ceiling | `525e047b2cbff31d4e415a8f9822a8414eabbaef` | current_fact | P02 ceiling；策略不能绕过 |
| `apps/api/src/dashboard/access.ts` | SA 五条规则=`service_accounts.manage`；invocations 当前=`settings.write` | `ca62fd6601be2d5848a627c148853f8267f9ceda` | current_fact | invocations 权限语义为 implementation decision gap |
| `apps/api/src/audit/foundation.ts` | safe metadata allowlist/denylist 与 2048B 上限 | `55c27508a391eda71f6e69a89d9d704afed2f962` | current_fact | P04 Audit |
| `apps/api/src/routes/erp-integration.ts` | machine auth/permission/Audit 的当前 ERP 消费者 | `03675fbff447aa2985ea6df18f2a12ec92b19cbe` | current_fact | ERP v1 能力仍 planned-only |
| `apps/api/src/middleware/rate-limit.ts` | 当前仅 IP-keyed public/auth/commerce/analytics rate limit | `2a91107dd4126eb48cf498eaf64b462a8d64afa9` | current_fact | absence evidence：无 SA 专属 rate limit |

### 6.3 draftValidator

exact typed keys、unknown reject；TTL 不得突破当前 365 天硬上限；one-time reveal、Token/tokenHash/Authorization/Cookie/secret-like 字段直接 blocker；Role/Permission 引用必须存在并通过 P02 actor ceiling；ERP machine scope 禁止 Payment、Customer PII 与 global admin；rotate overlap/scope/environment/rate-limit 缺 consumer 时 warning/degraded，绝不 fake-ready。

### 6.4 publishAdapter

publish 只激活 typed policy version；未来 publish/Audit/ledger/history 原子，`partialPublish=false`。禁止：创建/disable/修改 Service Account；创建/轮换/撤销/改 expiry Token；分配/删除 Role/Permission；调用 ERP/外部请求；修改 invocation log；回显 Token/tokenHash/Authorization/Cookie/secret。rollback 仅创建新 policy draft/publication，不恢复 revoked token 或逆转账号/权限/Audit 事实。

### 6.5 readinessAdapter

完全无副作用；ready consumer 必须 exact generation。S08 descriptor、rotate overlap、machine scope/environment、SA 专属 rate limit、Audit read model 或 ERP Product API machine consumer 缺失时必须 stable degraded；当前这些能力均 future obligation，绝不 current-executable 或 fake-ready。

### 6.6 auditDescriptor

future operation=`settings.publish/rollback (S08)`；resource=`settings.core / settings.api-service-account`；policy publish 用既有 `settings.write`，账号/Token 业务动作继续用 `service_accounts.manage`；P02 occurrence-time ceiling。safe metadata 仅 descriptor/version/changeReason/safe policy-family id；denylist 含 Token/tokenHash/Authorization/Cookie/DB credential/secret/完整 payload/McpToolInvocation input-output-error/PII；retention 继承 P04。

### 6.7 obligations、租约与验收边界

- current gaps：无 rotate overlap、max-active policy、machine scope/environment、SA 专属 rate limit、S08 descriptor/API/UI/readiness；McpToolInvocation/AuditLog 双事实面需一个安全读模型；invocations 当前 `settings.write` 权限语义待决。
- future obligations：typed S08 lifecycle；immutable one-time reveal；P02 ceiling；scope/environment；per-token/per-account rate limit；safe invocation read model；exact-generation consumers；ERP 使用最小机器权限。
- not-in-scope：S08 实现/Migration79、任何 SA/Token/Role/Permission 写入、真实 ERP 凭据/API、第二套 Token/auth/permission/page/Job/idempotency 架构、Main/部署/生产。
- leases：S08 独占未来 machine-credential shared-contract 写租约；P02/P04/P09 只读；S06/B01/F03 未来消费稳定 S08 身份，不得另建 Token。
- migration：当前 78，latest `20260807100000_s03_commerce_settings`；1–78 不可变；CG01 禁止 migration79，未来仅 S08 Goal 证明物理 schema 必需并获单独授权后可创建。
- acceptance：normal=只读 projection→typed draft→只读 impact→policy-only publish→exact/诚实 degraded→history；failure=secret/TTL/permission ceiling/缺 consumer；rollback=新 policy 版本、revoked token 不恢复、无账号/权限/Audit 反向动作。

## 7. Shared invariants

继承 S01 全部契约（第 1 节），包括 partialPublish=false、secret 永不回显、外部副作用默认 false、consumer-generation readiness。

## 8. Shared file leases

- `api-contract.ts` / runtime validators / Settings registry / Dashboard access：Integration 单写协调；
- P02/RBAC：S09 独占写租约；P04/Audit：S10 独占写租约；Storefront/CMS：S02 独占写租约；
- Commerce/Tax/Shipping/Inventory/Orders shared-contract：未来 S03 独占写租约；S04 仅 Payment Settings；
- ERP v1 字段 ownership/兼容面只引用 Overlay/Compatibility Contract/Manifest；S06/S08/B01/F03 不得另建架构；
- Service Account/Machine Authentication：未来 S08 独占写租约；P02/P04/P09 事实只读；S06/B01/F03 只消费稳定机器身份；
- 任一时刻只有一个 Backend 包拥有下一 migration；本轮不预先创建或承诺 migration79。

## 9. Migration boundary

- source migration 数 78；latest `20260807100000_s03_commerce_settings`；
- migrations 1–78 不可修改；
- CG01 禁止 migration79；
- 无 S08 runtime descriptor/route/API/UI/Worker 或业务实现。

## 10. Deferred v2 register

引用 `v2-known-remediation-register.md`（SHA-256 `275f6fd96efa60edc4c9b9d938b001f6c4101d03eb9786daf38834c0168e6c71`，编号截至 33；历史与前向项均只引用、不修改、不声称关闭）。

## 11. Scope guard

zero product/runtime/migration delta；无 S08 descriptor/route/API/UI/Worker/permission/DB 对象或 consumer；不创建/轮换/撤销 Token、不改变 Service Account/Role/Permission、不发真实凭据；DAG/三类进度不变；Main/生产不推进。
