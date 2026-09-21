# VanStro v1 S03 Commerce / Tax / Shipping / Inventory / Orders Settings — Implementation Contract

状态：`IMPLEMENTED_INTEGRATION_CERTIFIED`（S03 Commerce/Tax/Shipping/Inventory/Orders Settings 已实现并完成 Integration 双亲认证；闭包 identity 见 JSON finalIdentity）
Canonical JSON：`tasks/contracts/v1-s03-commerce-settings.v1.json`（本文件为其人读正文，语义与 JSON 一致并由 static test 证明）
Port：`cg01.commerce.v1`（consumer S03）
Task：`/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-s03-commerce-settings-implementation.md`（SHA-256 `13bdb6a3bf760552a0b1a0fc1a16122302c20298dcfd6c44c0eb0fb773ec2a94`）

## 0. 身份

- package：`S03`
- descriptor key：`settings.commerce`
- settings schema：`settings.commerce.v1`
- value type：object；secret：false；scope：global；mutable：true；partialPublish：false
- baseline Integration：`0d9e0f7a0337f0166acbf2e4af8dd9d6c66d5b75` / tree `71159d2a102dad92d96b29183b3f53db1317fcfe`
- migrations：77；latest `20260807000000_s10_privacy_retention_settings`；无 78
- 依赖：S01、CG01 Port `cg01.commerce.v1`；external baseline：Commerce/Tax/Shipping/Inventory/Orders current facts

## 1. Typed value shape — `PrivacyRetentionSettingsValueV1` 同款精确键

顶层 exact keys（五个字段族，均 required，未知 key reject）：

- `commercePolicy`：`minimumOrderAmountCents`（非负 safe integer CAD cents）、`guestCheckoutEnabled`、`checkoutEnabled`
- `taxPolicy`：`enabledProvinceCodes`（唯一加拿大省码数组 ≤13）、`calculationMode=current-tax-rate-table|disabled`、`roundingMode=nearest-cent`
- `shippingPolicy`：`pickupEnabled`、`deliveryEnabled`、`deliveryFlatFeeCents`、`serviceZoneMode=dealer-location-only|postal-prefix`、`fallbackMode=reject|pickup-only`
- `inventoryPolicy`：`reservationEnabled`、有界 `reservationTtlMinutes`（5–1440）、`availabilityMode=manual|erp`、有界 `staleAfterSeconds`（30–86400）、`staleBehavior=degraded-reject|manual-fallback`
- `orderPolicy`：`allowedLifecycleTransitions`（仅 paid/processing/fulfilled/cancelled）、`guestLookupEnabled`、`cancellationMode=erp-confirmed-only|disabled`

禁止万能 JSON；Cart/PaymentSession/Order/InventoryReservation/TaxRate/ERP mapping/job/webhook 实例永远是领域事实，不是 Settings 值。

## 2. Consumer 状态矩阵（只有 implemented_ready 可作完成证据）

| consumer | owner | entry | 状态 | generation | closure |
|---|---|---|---|---|---|
| checkout-availability | S03 | `apps/api/src/routes/commerce/index.ts` POST /checkout/session | implemented_ready（exact_generation） | exact | S03 |
| checkout-guest-minimum | S03 | checkout/session guest identity + totals 预检 | implemented_ready（exact_generation） | exact | S03 |
| tax-totals | S03 | computeCheckoutTotals/resolveCombinedTaxRate | implemented_ready（exact_generation） | exact | S03 |
| order-transitions | S03 | order status transition 校验 | implemented_ready（exact_generation） | exact | S03 |
| shipping-fee-service-zone | S03 | pickup/delivery capability + deliveryFlatFeeCents + service-zone/fallback | implemented_degraded（coverage_limited：service-zone/fallback 字段仅校验未消费） | exact | S03 |
| inventory-ttl-stale | S03 | inventory availability/reservation TTL/stale 读取 | implemented_degraded（coverage_limited：reservation TTL 字段仅校验未消费） | exact | S03 |

最终矩阵与 Runtime consumerMatrix 唯一一致：4 implemented_ready + 2 implemented_degraded（coverage_limited），0 future_obligation；overall readiness 只要存在 degraded consumer 就保持 degraded，绝不冒充 ready。B02/B04/B05 完整业务工作流与 ERP canonical ingest 仍为 future/non-S03（neverImplementedConsumers），不得为接满消费者而实现。

## 3. 生命周期（复用 S01）

overview/current projection、create/update draft、validate、safe diff、publish、history/events、rollback-draft、readiness、tax/shipping/inventory/order impact preview。保持 CAS、exact idempotency replay/conflict、descriptor-scoped publication sequence、append-only events、publish/Audit/ledger/history 原子、`partialPublish=false`、safe metadata 与 secret/PII/payment denylist、401/403/404/409/400 稳定错误族。

## 4. Validation 与 Preview

- Blockers：负数/unsafe minimum/fee；unknown/duplicate province；invalid tax mode；delivery 无合法 service-zone/fallback；illegal order transition；invalid reservation TTL/stale；ERP 字段 ownership 冲突；VanStro 权威字段被 ERP 规则覆盖。
- Warnings/Degraded：ERP inventory stale/unavailable；Tax/Shipping dependency unavailable；consumer generation missing/mismatch；未实现的 ERP canonical ingest consumer。
- Preview 只读：不得创建/修改 Cart/Order/Payment、reservation/lock/decrement/release、tax settlement/filing/provider、shipment/carrier/Canada Post、ERP sync/job/connector、Product/SKU/Price/Category 写入、回显 PII/payment 材料/库存明细/ERP 凭据。

## 5. Published Policy 消费者

S03 实现正式 Commerce policy resolver，只接入当前已存在且由 S03 拥有的最小 Commerce 路径：checkout enabled/guest/minimum、tax totals 中的 enabled provinces/mode/rounding、pickup/delivery fee 与当前已执行的 service-zone/fallback 校验、inventory TTL/stale 读取、order transition 允许转换读取。不得新建库存执行机制；不得实现 B02/B04/B05 未来工作流。

- 无 published policy 时使用当前事实/compiled defaults；
- 每个业务操作只解析一次 effective policy；
- consumer generation 精确匹配才 ready；依赖不可用或 mismatch 必须 degraded；
- Settings publish 本身不触发任何业务动作；
- 本地 fixture 证明 Commerce 正常路径，但不得调用 `payments/finalize`、创建真实 Payment/Order、消费真实 reservation、enqueue ERP/email job、调用真实 Payment/ERP/Canada Post 或其他外部 provider。

sandbox 验收精确定义：受控本地 fixture 完成 `cart input → policy-backed tax/shipping quote → draft validate/publish → exact-generation consumer projection`；完整 checkout/order/payment 执行属于 B02/B04/B05。

## 6. Migration 78

`packages/db/prisma/migrations/20260807100000_s03_commerce_settings/migration.sql`（Backend/S03 单写租约）。允许：`s03_*` 独立函数族、`settings.commerce` 独立 lock domain、ledger operation CHECK 与 shape CHECK 前向扩展、runtime registry descriptor、current/effective policy projection、consumer generation/readiness、必需 GRANT/REVOKE/post-assertions。禁止：修改 1–77 历史字节、替换 S01/S02/S09/S10 函数、新建 Product/SKU/Category/Cart/Order/Payment/Inventory/ERP 事实表、实现 S04/S05/S06/S08/B01/F03、存储 PII/payment 材料/ERP secret/业务实例、预建 ERP 临时表/Token/Job。Migration 后：78 个、latest S03、1–77 逐 blob 不变、无 79。

## 7. ERP 永久兼容边界

ERP=ERP 商品 ID、SKU/Variant 外部 ID、基础名称、Category 源编码、库存、成本、基础售价 Authority；VanStro=Media、SEO、营销文案、Storefront 发布状态、营销折扣 Authority；sellableStatus 组合。ERP push/VanStro pull 未来共用 canonical ingest、mapping、幂等 ledger、逐项回执。S03 不得另建 ERP 字段 ownership、商品表、Token、Catalog 页面、Job 或幂等体系。S06/S08/B01/F03 分工不变。旧 ERP 文档 ownership 口径无效。Manifest 在 S03 完成后仅记录 S03 阶段边界，`productContractFrozen` 不得冒充全部 ERP 产品契约完成。本任务不访问真实 ERP、不发真实凭据、不部署；禁止真实 Payment/ERP/Canada Post/carrier/tax provider 调用与任何外部副作用。

## 8. Routes

11 条生命周期路由 + `POST /dashboard/settings/s03-impact-preview`（`settings.read`），全部复用现有 `settings.read/settings.write`，不新增 permission。Routes 见 canonical JSON `routes`。

## 9. Frontend

中文 desktop 页面 `/dashboard/settings/commerce` + EN/fr 静态路由；CommerceSettingsPanel + module CSS；S03 location/transport/readiness；API contract/runtime validators；Dashboard Shell/Content 与 Settings routes；focused tests；S03 Browser harness。UI 仅用 `@/components/ui/*`，不直接导入 Radix/CVA/clsx/tailwind-merge，不 retrofit S01/S02/S09/S10，不改变既有页面视觉。页面覆盖五策略族、current/default、draft、validation、safe diff、preview、publish、readiness/degraded、history、rollback、错误/空/loading/a11y。

## 10. 验证门禁

db/api/worker/web typecheck；UI-0/package/contracts；CG01 19 项回归；S03 contract/static/migration78 static；真实 PG16 S01/S02/S09/S10/S03 生命周期与原子性；Commerce focused API/DB/consumer；preview 零写入；sandbox cart→tax/shipping quote→validate/publish→local fixture checkout；minimum order/guest checkout/service zone/tax province/delivery fee/reservation TTL/stale/order transition；consumer exact generation/readiness；DB/Worker 既有回归；EN/fr static export；Chromium current-tree；S03 Browser 完整正常/失败/history/rollback，unexpected console/request=0；S10/S09/S02/S01B 必要常驻回归；secret/PII/payment 扫描；Migration 78/无 79/1–77 不变；merge parents、完整目标 diff 与保护现场。任何完整门禁存在 fail/skip/not-run 时必须完整报告 discovered/pass/fail/skip/exit；基线复现不等于 pass。

## 11. 进度口径

功能上限：64%–68% + S03 `+3～4pp` → `67%–72%` 最大，不得因文件/测试量额外扩大；集成保持 `98%–99%`；发布仅在实际关闭既有发布前置时最多 +1pp（需具体依据），否则保持 `63%–66%`。任何指标不得 100% 或暗示完整 v1。

## 12. 成功条件（全部满足才 COMPLETE）

1. S03 Contract 与五策略族实现一致；
2. Migration 78 唯一、1–77 不变、无 79；
3. Backend/Frontend commits 可追溯；
4. Integration 真实双亲 merge；
5. 生命周期、consumer、preview、readiness、sandbox Commerce 正常路径成立；
6. 无真实 Payment/ERP/Canada Post 副作用；
7. ERP Compatibility 边界未分叉且未过度声明；
8. UI 只用 UI-0 入口，既有视觉不变；
9. 全部门禁真实报告；
10. Contract/Evidence/Continuity 一次收口；
11. 项目级进度符合冻结 roadmap；
12. Main/生产未推进（Main 保持 `8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b`）；
13. 最终报告 Path/SHA/Lines/Bytes/13 节/basis 一致。

完成后立即停止；不自动启动 S04/S05/S06/S08/B01/F03、Main、部署或生产。
