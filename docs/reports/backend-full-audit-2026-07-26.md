---
title: VanStro 后端全量审计报告
date: 2026-07-26
repo: /Users/zhangguannan/Documents/codex/vanstro
branch: claude/dealer-neutral-copy-sync-20260721
head: 05ece178d339f2dd0e82a1a175bfb3d402b034c0
feature_baseline: 3eb35c5340dd68a6b0a5aee3fb5eb2ae522087f9
status: NEEDS WORK — not production certified
---

# VanStro 后端全量审计报告

## 1. 执行摘要

### 最终结论

**总体状态：NEEDS WORK，不具备生产上线认证条件。**

当前系统不是“不能运行”：

- `pnpm typecheck` 已实际通过；
- `pnpm test:api` 在加载根 `.env` 后实际通过，结果为 70/70；
- `pnpm api:smoke` 已实际通过；
- API 核心模块和本地 PostgreSQL 组件已具备较完整实现；
- 支付回调正常路径、单 SKU 原子库存预留、Token 哈希、Dashboard 默认拒绝 ACL 等基础控制已经存在。

但当前也不能描述为“完整后端已验证”或“本地全栈闭环已验证”：

- 支付、库存和订单状态存在生产阻断级一致性问题；
- 管理员权限管理存在直接提权路径；
- Worker 没有执行级测试；
- Moneris、SMTP、ERP、Canada Post 均未完成真实 E2E；
- Backend CI 当前按配置无法正常通过；
- API smoke 是进程内测试，并且具有数据库破坏性；
- OpenAPI 生成器产生错误契约；
- 部分交接材料中的“已完成且已验证”高于现有证据水平。

### 建议质量评级

| 维度 | 评级 |
| --- | --- |
| API 核心实现 | B |
| 数据一致性 | C |
| 支付生产就绪 | D |
| 身份与授权 | D+ |
| Worker 可靠性 | C- |
| API 契约 | D |
| 数据库迁移与恢复 | C- |
| 隐私工程 | C- |
| CI/CD 与可部署性 | D+ |
| 整体生产就绪 | **FAILED** |

### 上线建议

在生产阻断项和主要高优先级项修复、并发与故障注入测试补齐、CI 修复，并完成真实 Moneris/SMTP/ERP E2E 前，**不建议上线或接受真实付款与订单**。

---

## 2. 审计范围与方法

### 审计范围

- `apps/api`
- `apps/worker`
- `packages/db`
- `packages/cli`
- `src/lib/api`
- Storefront 与支付/订单相关调用代码
- Prisma schema、migrations、seed、permissions
- API contracts、OpenAPI、Dashboard ACL
- CI、workspace、Docker、本地运行和部署入口
- `CLAUDE.md`、`SPEC.md`、`DECISIONS.md`、`tasks/handoff.md` 及相关交接资料

### 专项审计维度

本次使用多个独立专业角色并行审查，覆盖：

1. 后端整体架构与模块边界；
2. 全业务域功能正确性；
3. 代码 correctness、竞态与异常处理；
4. API 契约、状态码、鉴权和 OpenAPI；
5. Prisma schema、查询、索引与事务；
6. 身份认证、Session、RBAC 和 IDOR；
7. 支付、订单、库存与幂等；
8. 隐私、Consent 和 PII 数据治理；
9. API/Worker 生产可靠性；
10. CI/CD、Docker、Migration 和工程可复现性；
11. 数据库迁移与生产数据安全；
12. 交接材料中功能完成声明的真实性。

所有候选发现经过交叉去重和源码复核。相互矛盾或证据不足的结论已剔除，详见“误报与修正”。

### 本轮实际验证

```text
pnpm typecheck                 PASS
pnpm test:api                  70/70 PASS（需先加载根 .env）
pnpm api:smoke                PASS
pnpm generate:openapi         已执行用于验证生成器缺陷，随后恢复生成文件
```

审计没有执行生产部署、生产迁移、外部真实支付、push 或 destructive Git 操作。

---

# 3. 生产阻断问题（P0）

## P0-1 管理员可重置高权限用户密码并接管超级管理员

**证据**

- `apps/api/src/routes/dashboard.ts:371-407`
- `apps/api/src/routes/dashboard.ts:418-443`
- `apps/api/src/routes/dashboard.ts:484-499`
- `apps/api/src/dashboard/access.ts:27`
- `apps/api/src/dashboard/permission-ceiling.ts:80-115`

`PATCH /dashboard/users/:id` 只要求 `users.manage`。它允许修改任意用户密码并撤销目标 Session，但没有检查操作者是否有权管理目标用户。状态修改和角色删除同样缺少对称的目标权限层级保护。

**失败场景**

低权限运营管理员拥有 `users.manage` 后，可以指定超级管理员 ID、设置新密码、撤销超级管理员现有 Session，然后使用新密码登录并获得全部权限。

**修复要求**

- 用户编辑、密码重置、状态修改、角色增删全部执行目标权限层级检查；
- 禁止操作者修改权限高于或等于自己的用户；
- 超级管理员凭据使用独立、step-up 验证流程；
- 禁止删除最后一个超级管理员；
- 所有管理员密码设置路径使用统一的至少 12 字符密码策略。

---

## P0-2 Deployment 可开启支付模拟，形成免费下单路径

**证据**

- `.env.example:18-19`
- `apps/api/src/config.ts:49-64`
- `apps/api/src/routes/commerce/index.ts:742-759`

环境模板默认开启服务端和前端支付模拟。Deployment 配置未禁止该开关，`POST /payments/simulate` 也不验证用户、guest token 或管理员权限，而是直接生成可被支付 callback 接受的 HMAC。

**失败场景**

生产环境漏关模拟开关时，客户可创建 cash/POS checkout，调用模拟接口取得有效签名，再调用 payment callback，在没有实际付款的情况下创建 paid 订单并触发库存、邮件和 ERP。

**修复要求**

- Deployment 模式检测到 simulation 时拒绝启动；
- 只在 development/test 模式注册该路由；
- 即使在测试环境，也要求受控测试身份；
- `.env.example` 默认设为 `false`；
- 增加 Deployment 配置负向测试。

---

## P0-3 支付回调与预留过期并发，可创建已付款订单但不扣库存

**证据**

- `apps/worker/src/index.ts:31-72`
- `apps/api/src/routes/commerce/index.ts:791-852`

Worker 先逐条将 reservation 改为 `expired` 并减少 `quantityReserved`，最后单独批量将 PaymentSession 改为 `expired`。支付 callback 可在两者之间将仍为 pending 的 Session 认领为 paid，随后查询不到 active reservation，但仍创建订单。

**影响**

已付款订单未减少 `quantityOnHand`，同一库存可继续出售，形成账实不一致和超卖风险。

**修复要求**

- Session 过期认领和 reservation 释放必须在同一事务内；
- Worker 只有成功执行 `pending → expired` 才能释放预留；
- Callback 必须验证 active reservation 的 SKU、数量与 Session items 完整匹配；
- 缺少任何 reservation 时不得创建正常 paid 订单；
- PSP 已收款但库存异常时进入 `reconciliation_required`。

---

## P0-4 Moneris 回执关键字段缺失时验证 fail-open

**证据**

- `apps/api/src/payments/moneris.ts:97-113`

当前代码只在 `order_no` 或 amount 存在时比较。字段缺失或不可解析时，验证仍可能返回 `ok: true`。

**修复要求**

Moneris 成功必须要求并匹配：

- `order_no`；
- amount；
- currency（若 provider 返回）；
- provider transaction ID。

任一字段缺失、不可解析或不匹配都必须 fail closed。

---

## P0-5 Moneris 支付确认依赖浏览器回调，存在“已扣款、无订单”

**证据**

- `src/components/checkout/PaymentClient.tsx:92-122`
- `apps/api/src/routes/commerce/index.ts:762-880`

Hosted Checkout 成功后，只有浏览器 SDK callback 才会调用 VanStro `/payments/callback`。仓库中没有 Moneris 服务端事件、主动查询恢复或对账补偿任务。

**失败场景**

Moneris 已扣款，但用户关页、断网或浏览器崩溃，VanStro callback 未发生；Session 最终过期并释放库存，但系统没有订单。

**修复要求**

- 接入 PSP 服务端事件或定时 reconciliation；
- 持久化 PaymentAttempt/PaymentEvent；
- 根据 provider transaction 恢复漏单；
- 增加“收款成功但订单落库失败”的人工处理和退款状态。

---

## P0-6 已支付但晚到的回调被直接拒绝，无补偿模型

**证据**

- `apps/api/src/routes/commerce/index.ts:781-803`
- `packages/db/prisma/schema.prisma:51-56`

Provider 先确认支付成功，代码随后才检查 Session 是否仍 pending 且未过期。若已过期则直接返回 409，且没有异常支付或退款状态。

**修复要求**

支付事实独立持久化。已确认支付但 Session 过期时必须记录异常事件、告警，并进入安全建单或退款队列，不能只返回 409。

---

## P0-7 订单取消并发会重复补库存

**证据**

- `apps/api/src/dashboard/system.ts:597-617`
- `apps/api/src/routes/commerce/index.ts:1155-1169`
- `apps/api/src/integrations/erp-sync/inventory.ts:40-67`

Dashboard 和 ERP 取消路径都在事务外读取旧状态，事务内按 ID 无条件更新，并根据事务外旧状态决定是否补库存。

**失败场景**

两个请求同时读取到 paid，随后都将订单更新为 cancelled 并补库存，单个订单可能被补回两次。

**修复要求**

- 在事务内执行带当前状态条件的 claim；
- 只有成功改变状态的事务才能补库存；
- 建立持久化库存 reversal 表和唯一业务键；
- Dashboard 和 ERP 调用同一个状态迁移服务。

---

## P0-8 生产 seed 会静默覆盖真实业务数据

**证据**

- `packages/db/src/seed.ts:477-489`
- `packages/db/src/seed.ts:537-559`
- `packages/db/src/seed.ts:563-597`
- `packages/db/src/seed.ts:786-790`

重跑 seed 会覆盖库存、税率、CMS、法律页面、文章、邮件模板以及部分价格和目录数据。库存会被重置为 `quantityOnHand=100`。

**修复要求**

拆分为：

1. 安全幂等的 `bootstrap-rbac`；
2. 受审查的 `reference-data`；
3. 仅允许空测试库使用的 `demo-data`。

Deployment 模式必须禁止 demo seed。

---

## P0-9 API smoke 是破坏性程序，但没有测试库保护

**证据**

- `package.json:35-41`
- `apps/api/src/smoke.ts:55-111`
- `apps/api/src/smoke.ts:1250-1255`
- `apps/api/src/smoke.ts:1556-1606`

Smoke 会删除、归档和重写数据，并重置共享 SKU 库存，却只加载当前 `.env`，不验证是否为专用测试库。

**修复要求**

强制要求明确的 test 模式和破坏性测试授权，校验数据库名，并优先采用每次创建后整体销毁的临时数据库/schema。

---

# 4. 高优先级问题（P1）

## P1-1 ERP shipment 幂等键导致 delivered 更新永久丢失

- 证据：`apps/api/src/routes/commerce/index.ts:1207-1211`
- 当前使用 `shipmentId` 作为唯一事件 ID。
- 同一运单先 shipped、再 delivered 时，第二条被当成重复事件。

**修复：** 使用 ERP 独立 `eventId`；兼容方案至少使用 `shipmentId:status`。

## P1-2 ERP 状态没有状态机和版本，订单可倒退或复活

- 证据：`apps/api/src/routes/commerce/index.ts:1153-1169,1220-1232`
- cancelled 可被 shipped 改回 processing；fulfilled 可被旧事件改回 processing。

**修复：** 集中状态机、事件序号/版本、事务内条件更新，终态默认不可回退。

## P1-3 ERP webhook 签名没有覆盖全部影响字段

- 证据：`apps/api/src/routes/commerce/index.ts:1148-1149,1198-1200`
- `erpSystem` 和 `trackingNumber` 未进入签名，却影响幂等命名空间、事件和客户邮件。

**修复：** 对规范化完整 payload 或原始 body 签名，并加入 timestamp、event ID 和重放窗口。

## P1-4 手动释放 reservation 可并发重复 decrement

- 证据：`apps/api/src/routes/commerce/index.ts:953-960`
- 事务外检查 active，事务内无条件更新和 decrement。

**修复：** 事务内条件 claim，仅 `count===1` 时递减，并增加库存非负数据库 CHECK。

## P1-5 Checkout 核心事务提交后 CRM 失败会卡死结账

- 证据：`apps/api/src/routes/commerce/index.ts:622-672`
- PaymentSession 和 reservation 已提交后，CRM 单独事务失败会导致 API 返回 500；重试因 pending Session 返回 409。

**修复：** CRM 使用 transactional outbox，或纳入同一事务；同时支持幂等恢复已有 Session。

## P1-6 Checkout 幂等实现未挂载

- 证据：`apps/api/src/middleware/idempotency.ts:4-29`、`apps/api/src/app.ts:84-139`
- 前端也不发送 `Idempotency-Key`。

Migration 已有 pending cart 部分唯一索引，因此“并发一定创建两个 pending Session”不成立；真实问题是无法重放第一次成功响应和恢复 Session/token。

**修复：** 持久化 `Idempotency-Key + actor/cart + body hash + response`。

## P1-7 取消订单不处理退款

- 证据：`apps/api/src/dashboard/system.ts:583-617`
- 系统只改订单状态并补库存，没有退款状态、provider refund ID 或退款失败流程。

**修复：** 分离履约状态与支付/退款状态，卡订单取消进入显式 refund workflow。

## P1-8 Delivery 税率取 dealer 省份而非收货省份

- 证据：`apps/api/src/routes/commerce/index.ts:574-619`

**修复：** Pickup 使用 dealer province；Delivery 根据财务确认的 place-of-supply 规则使用 shipping jurisdiction，并保存税率版本快照。

## P1-9 有效价格时间窗被忽略

- 证据：`apps/api/src/routes/commerce/index.ts:44-57`
- 价格只过滤 `status=active`，未检查 `effectiveFrom/effectiveUntil`。

**修复：** 统一价格解析服务，并在数据库防止有效区间重叠。

## P1-10 多币种可以混加，但 PaymentSession 默认记为 CAD

- 证据：`packages/db/prisma/schema.prisma:470-484`、`apps/api/src/routes/commerce/index.ts:613-641`

**修复：** Checkout 验证单一币种并显式写入 Session；加拿大业务可限定 CAD。

## P1-11 自动选择 dealer 时未检查履约能力

- 证据：`apps/api/src/routes/commerce/index.ts:588-600`

**修复：** 自动候选必须同时过滤 active dealer、履约能力和库存。

## P1-12 Delivery 未强制加拿大国家与省份

Delivery 可接受非 CA country，province 也缺少完整 allowlist。

**修复：** 强制 `country=CA`，province 使用加拿大省/地区枚举。

## P1-13 SMTP 密码明文落库

- 证据：`apps/api/src/dashboard/system.ts:340-367`、`apps/worker/src/index.ts:75-98`

**修复：** 使用 Secret Manager，或 KMS envelope encryption，并轮换现有凭据。

## P1-14 Guest order bearer token 位于 URL，且无独立过期/撤销

- 证据：`src/components/checkout/PaymentClient.tsx:87-90`、`apps/api/src/routes/commerce/index.ts:734-739,890-919`

**修复：** 使用短期 HttpOnly cookie 或一次性兑换码；Token 只存哈希并支持过期、撤销和账号认领后失效。

## P1-15 Session 架构把 7 天 refresh token 直接当 access token

- 证据：`apps/api/src/auth/session.ts:201-307`

**修复：** 短期 access token + HttpOnly refresh cookie；refresh token 不可直接访问业务 API；增加 token family 和重放检测。

## P1-16 OpenAPI 生成器产出错误契约

- 证据：`scripts/generate-openapi.mts:6-10`

已实际复现：

- `/auth/login` 被生成成 GET；
- `/checkout/session` 被生成成 GET；
- 出现 `catalog`、`warranty`、`pending` 等不以 `/` 开头的假路径。

验证后已恢复命令造成的 OpenAPI 文件变更。

**修复：** 建立 method/path/request/response/schema 的真正机器真源，并在 CI 与运行时路由双向 diff。

## P1-17 CORS 缺少实际使用的自定义头

- 证据：`apps/api/src/app.ts:89-101`
- 缺少 `X-Payment-Signature`、`X-Reservation-Token`、`Idempotency-Key`。

**修复：** 补全 allowlist，并增加真实 OPTIONS 预检测试。

## P1-18 API 同时暴露版本化和无版本路径

- 证据：`apps/api/src/app.ts:138-139`

**修复：** 生产仅暴露 `/api/v1`；旧入口如有消费者，先执行正式弃用流程。

## P1-19 Backend CI 当前确定性失败

- 证据：`.github/workflows/backend-ci.yml:36-54`

独立阻断点：

1. `VANSTRO_RUNTIME_MODE=local`，代码只接受 `development|deployment`；
2. CI 执行 seed，但未设置 `SUPER_ADMIN_PASSWORD`。

---

# 5. 中优先级问题（P2）

## 5.1 功能与数据

1. **Shipment 投影接口不一致**：订单详情按升序加载事件，状态接口按降序加载，而 `extractShipment()` 取第一个，导致一个返回最旧 shipment、一个返回最新。
2. **Analytics `paidOrders` 统计错误**：只统计当前仍为 paid 的订单，进入 processing/fulfilled 后被漏掉。
3. **Catalog partial failure 被标记 succeeded**：单 SKU 错误被放入 `result.errors`，上层仍标记成功。
4. **Catalog 只读取第一页最多 500 个产品**。
5. **Catalog scheduler 多实例非原子**：查询 latest 后再创建 run，无分布式锁。
6. **一次 scheduled sync 产生 scheduled 与 manual 两条 run**。
7. **Catalog 失败后仍被完整 6 小时间隔抑制**。
8. **一个账户可存在多个默认地址**。
9. **并发评价可绕过 pending review 去重**。
10. **CRM contact 更新与 stage event 非原子**。
11. **CRM ERP 同步状态可能长期停在 queued**。
12. **客户订单历史无分页**。
13. **Dashboard 多处 enum 依赖 TypeScript 断言**，非法值进入 Prisma 后变成 500。
14. **公开订单响应原样透传内部 status payload**。
15. **卡支付失败没有持久化 failed/declined 细分状态**。
16. **缺少退款、PSP settlement、chargeback 和 reconciliation 模型**。
17. **批量 commerce/inventory 前端类型与后端响应 shape 不一致**。
18. **产品资源上传客户端调用了错误的公共路径**。
19. **分页 meta 在 storefront、Dashboard 和公共契约间漂移**。
20. **多类 Dashboard/机器错误缺少稳定 `code`**。

## 5.2 Worker 与可靠性

21. **Worker 所有 handler 放在单个 try 中**，前序任务失败会阻止后续队列处理。
22. **Worker 可持续失败但保持存活，无 heartbeat/readiness**。
23. **邮件属于 at-least-once**，SMTP 成功后 DB ack 前崩溃会重复发信。
24. **Lease TTL 可短于外部调用 timeout，且没有续租**。
25. **固定 ERP 重试缺少指数退避和 jitter**。
26. **API 无优雅停机和 Prisma drain**。
27. **Readiness DB 查询缺少短 deadline**。
28. **API 缺少请求完成日志、延迟指标和 request ID 关联**。
29. **内存 rate limiter 多实例可绕过且 Map 不清理**。
30. **Worker 信号处理器在首次 tick 后才注册**。
31. **极高邮件最大重试配置可导致退避时间溢出或无效日期**。

## 5.3 数据库与迁移

32. **已有热表使用阻塞式 `CREATE INDEX`**，缺少 `CONCURRENTLY` 和 lock timeout。
33. **隐私 migration 单事务全表回填后立即验证约束**。
34. **连接数没有实例级预算、pool timeout 或 pooler 方案**。
35. **部分高增长外键缺少索引**，包括 email attempts/events、ERP attempts、refresh sessions、service account tokens。
36. **Analytics unique sessions 全部拉到 Node 内存**，应使用数据库 `COUNT(DISTINCT ...)` 或预聚合。
37. **Dashboard 多个高增长列表缺少对应排序索引和 keyset pagination**。
38. **InventorySnapshot 的 `ON DELETE SET NULL` 与 `NULLS NOT DISTINCT` 唯一索引存在删除冲突风险**。
39. **TaxRate 一省一行，无法保存未来和历史税率版本**。
40. **库存合并 migration 不可逆，且没有保存原始冲突行或可执行恢复步骤**。
41. **缺少仓库级 PostgreSQL PITR、恢复演练及 RPO/RTO 证据**。

## 5.4 隐私与数据治理

42. **Analytics 只信任客户端自报 `consentAnalytics=true`**，服务端无法证明或验证真实 Consent。
43. **除 consent event 外缺少统一 PII retention**。
44. **没有完整 DSAR 导出与删除管线**。
45. **Pageview 保存完整 referrer，可能将 query token/PII 写入分析表**。
46. **Analytics 未排除 account、payment、order 等敏感路径**。
47. **外部错误消息未经净化写入日志和数据库**。
48. **同一 PII 被复制到 CRM、订单、邮件、ERP 等多层，但无统一删除路径**。

## 5.5 工程交付

49. **Worker 没有 test script 或测试文件**。
50. **API/Worker 没有 production build 产物**：`start` 依赖 devDependency `tsx`，production-only install 后无法启动。
51. **Backend CI path filter 遗漏根 package、lock、workspace 等关键文件**。
52. **CI smoke 不启动真实 API/Worker 进程**。
53. **Node 版本未统一**：文档 20+、Backend CI 22、Pages 24、本地验证 25。
54. **Pages demo 未设置 API URL，会 fallback 到生产域名**。
55. **测试修改共享 seed 库存且不恢复**。
56. **`apps/erp-mock` 在 workspace 中但不受门禁保护**。
57. **CLI binary 缺 executable bit，并依赖预先构建的 dist**。
58. **`.gitignore` 宽泛忽略 `qa/*`，新增 QA 源脚本可能静默漏提交**。

---

# 6. 正向控制与已确认安全边界

以下方面已检查，没有发现足以形成缺陷的证据：

1. Payment callback 对同一 PaymentSession 的基本建单幂等存在数据库和事务保护。
2. Checkout 单 SKU 库存预留使用带可用量条件的原子 SQL UPDATE。
3. 正常支付路径中，订单、库存消费、订单事件、邮件 outbox 和 ERP order job 位于同一事务。
4. Manual/POS callback 使用 HMAC-SHA256 和 timing-safe comparison。
5. 客户 Session 与 service account token 均以 hash 存储，数据库不保存明文 token。
6. Session 有撤销和过期检查。
7. ERP webhook 在 secret 未配置时 fail closed。
8. Dashboard ACL 对未映射路由默认拒绝。
9. 添加角色路径已有 permission ceiling，缺陷主要集中在密码、状态和角色删除路径。
10. ERP、Canada Post、Moneris 主要客户端具有外部调用超时。
11. Deployment 模式会拒绝过短或 placeholder 的核心 webhook secret。
12. 根 `.env` 未被 Git 跟踪，未发现仓库内真实私钥或明显真实 token。
13. 本地 PostgreSQL Compose 仅绑定 `127.0.0.1`，符合本地开发定位。

---

# 7. 误报与修正

## 7.1 “并发 Checkout 一定创建两个 pending Session”不成立

Migration 已有部分唯一索引：

- `packages/db/prisma/migrations/20260726140000_commerce_inventory_hardening/migration.sql:44-46`

真正问题是缺少持久化幂等响应、唯一冲突恢复以及首次响应丢失后的 Session/token 恢复。

## 7.2 “Worker 完全没有 SIGTERM”不成立

Worker 在 `apps/worker/src/index.ts:587-608` 有 SIGINT/SIGTERM 处理。真实问题是处理器在首次 tick 后才注册、无 heartbeat，以及单 handler 故障阻塞整轮。API 自身没有优雅停机。

## 7.3 “缺少生产 Docker/Kubernetes 本身就是现有代码缺陷”未单独成立

项目已明确生产基础设施尚未开始且需另行授权。但这仍意味着系统不能获得生产就绪认证。

## 7.4 “70 项测试都是集成测试”不成立

现有测试混合了：

- 单元测试；
- 组件测试；
- 部分真实 PostgreSQL 集成；
- fake repository；
- 外部系统 fetch mock；
- 进程内 Hono request。

它们不能代表真实 Worker、浏览器、HTTP 进程或外部服务 E2E。

---

# 8. 真实完成度修正

| 模块 | 可信状态 |
| --- | --- |
| API 核心业务代码 | 已实现，部分数据库组件验证 |
| Cart/Checkout 正常路径 | 已实现，但并发和失败补偿未通过生产审查 |
| Manual payment | 基础 HMAC 路径验证，但 simulation 配置危险 |
| Moneris | 接线完成，未达到生产级 |
| Orders/Shipment | 已实现，但状态机和幂等存在缺陷 |
| CRM | 主要接线完成，部分验证 |
| Worker Email | 代码完成，未执行级验证 |
| Worker ERP | 代码完成，真实上游和消费者未验证 |
| Catalog cron | 代码完成，存在并发、分页和状态问题 |
| Dashboard SMTP | 代码完成，凭据存储不合格，真实发送未验证 |
| Analytics | 基础实现完成，Consent 和统计语义需修复 |
| OpenAPI | 不可用 |
| Backend CI | 当前不可用 |
| 浏览器全链路 | 未证明 |
| 生产部署 | 未开始、未授权 |
| 总体 | **NEEDS WORK** |

---

# 9. 推荐修复路线

## 第一批：立即阻断风险

1. 修复管理员权限层级和密码重置提权；
2. Deployment 禁止 payment simulation；
3. Moneris receipt fail-closed；
4. 设计 PSP server-side recovery/reconciliation；
5. 原子化 PaymentSession 过期与 reservation 释放；
6. 修复订单取消重复补库存；
7. 修复 reservation release 重复 decrement；
8. 给 smoke 和 seed 增加生产环境硬保护。

## 第二批：支付与履约闭环

9. ERP 状态机、event ID 和完整 payload 签名；
10. 修复 shipment delivered 去重；
11. 分离 order、payment 和 refund 状态；
12. 统一 Delivery 税率、币种和地址策略；
13. 持久化 Checkout idempotency；
14. 修复自动 dealer 选择。

## 第三批：安全与数据保护

15. SMTP secret 迁移到 Secret Manager/KMS；
16. Guest token 移出 URL；
17. 重构 access/refresh Session；
18. 公开订单事件改用允许列表 DTO；
19. 建立 PII retention 与 DSAR 管线；
20. 建立服务端可验证的 Consent。

## 第四批：Worker 和工程门禁

21. Worker 状态机拆分并加入数据库集成测试；
22. 为每个 Worker handler 建立独立故障边界；
23. 加入 lease renewal、heartbeat 和分布式 Catalog 锁；
24. 修复 Backend CI；
25. 建立 API/Worker production build；
26. 增加真实 HTTP process smoke 和 `worker --once`；
27. 修复 OpenAPI 生成和契约测试。

## 第五批：性能与生产可靠性

28. 建立在线 migration 策略；
29. 制定连接池预算并接入 PgBouncer/托管代理；
30. 补充索引和 keyset pagination；
31. 增加 metrics、tracing、结构化日志和 SLO；
32. 建立 PostgreSQL backup/PITR 与 restore drill；
33. 实现 API graceful shutdown。

---

# 10. 建议验收门禁

在解除生产阻断前，至少要求：

```text
[ ] 所有 P0 已修复并有回归测试
[ ] 支付/过期/取消/释放并发测试通过
[ ] Moneris 缺字段和金额不匹配负向测试通过
[ ] 生产模式无法启用 payment simulation
[ ] seed/smoke 对非测试数据库 fail closed
[ ] Worker 双实例 claim、lease、重试测试通过
[ ] Backend CI 从全新 runner 完整通过
[ ] API process-level smoke 通过
[ ] Worker --once smoke 通过
[ ] OpenAPI 与运行时 method+path 双向一致
[ ] Moneris QA 真实 E2E 通过
[ ] SMTP 真实投递与重复发送故障测试通过
[ ] ERP 真实合同、乱序和重复事件测试通过
[ ] 数据库备份恢复演练完成并记录 RPO/RTO
```

---

# 11. 最终判断

VanStro 后端已经具备相当数量的业务模块，不需要推倒重写；当前更准确的状态是：

> **功能面较完整的本地 API 实现，尚未完成支付、库存、授权、Worker、契约和生产可靠性的系统硬化。**

在生产阻断项和主要高优先级项修复、并发与故障注入测试补齐、CI 修复，并完成真实 Moneris/SMTP/ERP E2E 前，不应将该系统认证为生产可用。
