# VanStro v1 S08 API / Service Accounts Settings — Implementation Contract

状态：`IMPLEMENTED_INTEGRATION_CERTIFIED`（S08 API / Service Accounts Settings 已实现并完成 Integration 双亲认证与真实 Backend / 机器 rate-limit 覆盖收口；闭包 identity 见 JSON finalIdentity）
Canonical JSON：`tasks/contracts/v1-s08-api-service-accounts.v1.json`（本文件为其人读正文，语义与 JSON 一致并由 static test 证明）
Port：`cg01.api-service-account.v1`（consumer S08）
descriptor：`settings.api-service-account`；schema：`settings.api-service-account.v1`

## 1. Authority

- dependsOn：S01、CG01；external baseline：P02、P04、P09-current-facts、ServiceAccount-current-facts
- 任务 SHA-256：`75994daa16a0cd2cd9e17730c71930ea302c179313363d7d761e57b0b435218b`
- 冻结基线：Integration `a02aa880da70a21c88ca2c60098662c346d430ff` / tree `aa90815ec73f8316c36e1b435d6af31e1ba495b3`；migrations 78 / latest `20260807100000_s03_commerce_settings` / 无 79

## 2. 策略与业务动作分离

Settings draft/publish 只管理四策略族：

- `tokenLifecyclePolicy`：defaultTtlDays（当前事实默认 90）、maximumTtlDays（不超过 365 硬上限）、requireExpiry；rotationOverlapMinutes 与 maximumActiveTokensPerAccount 为 future obligation；
- `machineScopePolicy`：allowedRoleKeys / allowedPermissionFamilies（引用 P02，不复制实例）、environment、dealerLocationScopeMode、denySensitivePermissionsByDefault；
- `rateLimitPolicy`：requestsPerMinute（硬上限）、burst（除非持久化分布式模型可安全表达，否则 implemented_degraded/coverage_limited）、mode=per-token|per-account、retryAfterSemantics；
- `auditInvocationPolicy`：invocationRetentionDays（引用 P04）、metadataRedactionMode、lastUsedTrackingEnabled、failedAuthenticationAuditEnabled。

Publish 禁止：创建/轮换/撤销 Token；创建/disable/修改 Service Account；分配/删除 Role/Permission；调用 ERP 或外部系统；修改 invocation logs；返回明文 Token。Rollback 只创建新 policy 版本，不恢复 revoked token、不重开 disabled account、不改写权限或 invocation/Audit 事实。

显式业务动作（独立 permission + P02 ceiling + CAS/lock + Audit + 稳定错误码）：create account、update name/status/roles、create token、rotate token、revoke token、disable account 并撤销有效 Token、查看 metadata 与调用日志。

权限映射：

- Settings 生命周期（draft/validate/diff/publish/history/rollback/readiness/preview）：`settings.read` / `settings.write`；
- Service Account/Token 业务动作：`service_accounts.manage`（P02 ceiling）；
- invocation list/detail：`service_accounts.manage`（本轮前向纠正现有 `settings.write` 误配）；
- 机器 API 调用：既有 route machine permission，不因 S08 publish 扩大。

## 3. Immutable 安全不变量

- Token 继续使用稳定 `vsa_` 前缀；DB 只存 SHA-256 `tokenHash`；
- 明文 Token 只在成功 create/rotate 响应中显示一次；list/detail/second read 永不返回明文；
- one-time reveal 不是可配置字段，不能关闭；
- Token、tokenHash、Authorization、Cookie、secret、credential 永不进入 Settings/Audit/History/log；
- revoked token 不可恢复；disabled account 不可认证或获得新 Token；
- 角色/权限分配不能突破 P02 actor permission ceiling；
- ERP 机器身份不得包含 Payment、Customer PII 或全局 admin 权限。

## 4. Migration 79

`migration79 — s08_api_service_accounts`（`packages/db/prisma/migrations/20260808000000_s08_api_service_accounts/migration.sql`）：

- `s08_*` Settings policy validate/compile/controlled 函数，复用现有 Settings 授权、publication event、command ledger 与 Audit；
- settings_command_ledger operation CHECK、runtime_config_registry、settings_core_shape_check 前向扩展；
- 单一 descriptor 使用一个复合 value 承载四策略族，复用单 descriptor CAS/publish/rollback 原子模型；
- 最小 ServiceAccount/Token 生命周期 metadata（environment/scope/rate-limit/rotation 关系）仅在现有事实无法表达时新增；
- rotate predecessor/replacement 关联；per-account/per-token rate-limit 稳定状态；
- 索引、ACL、post-assertions。

禁止：修改 Migrations 1–78；重建 ServiceAccount/Token/Role/Permission/Audit 事实表；存明文 Token；第二套 Token/auth/permission/ledger/publication/Audit/幂等体系；ERP Product API/connector/Catalog/Import-Export/Job；修改 ERP API v1 路径或字段。完成态：79 个 migration、latest S08、1–78 逐 blob 不变、无 80。

## 5. Token Lifecycle 实现语义

- Create：复用 `createServiceAccountToken` 与 row lock；默认 TTL 由 published policy 解析（无 policy 时 90 天）；最大 TTL 不超过 365 天；一次响应明文，后续 metadata-only；maxActiveTokens 与 requireExpiry 生效；失败不产生部分 Token 记录。
- Rotate overlap：显式端点；原 Token 必须属于目标 Service Account 且 active；同一事务原子创建 replacement、把原 Token `expiresAt` 收窄到 `min(existingExpiresAt, now + overlap)` 并记录 replacement/predecessor 关联；认证路径继续以 `expiresAt > now` 惰性判定，不新增定时 Job；显式 revoke 仍可提前终止。
- 幂等重放：同一 Idempotency-Key + 同一 requestHash 重放不创建第二个 Token、不回显明文，只返回相同 replacement token ID/状态/expiresAt/overlapUntil 与 `plaintextAvailable=false`；同 key 不同 requestHash 返回稳定 409；不提供恢复或二次读取明文端点；rotate/revoke 并发由同一事务 row lock、条件更新与 CAS 解决，CAS 失败不留 replacement 孤儿。
- Revoke/Disable：revoke 即时生效；disable 撤销所有 active/overlap Token；second revoke 稳定返回 not-found 或 idempotent 已撤销语义（由 Contract 冻结）。

## 6. Machine Scope 与 Permission Ceiling

S08 实现最小机器 scope：environment、global/dealer/location scope mode、allowedRoleKeys、allowedPermissionFamilies、deny-sensitive-by-default。复用 P02 permission ceiling 与现有 Role/Permission 事实。ERP 商品 Service Account 允许面仅来自最小商品权限（`cli.access`、`erp.catalog.read`、`erp.catalog.sync` 仅在未来 ERP 写入启用前不可授真实生产凭据）。Scope 必须在机器请求边界执行，不能只在 Dashboard 显示。

## 6.5 真实 Token 列表与机器路由覆盖

- 真实 Backend 新增 `GET /dashboard/mcp/service-accounts/:id/tokens`（access 规则 `service_accounts.manage`；handler 内 P02 `assertManageableServiceAccounts`，不可管理 403、不存在 404）。
- 响应严格七字段 `id/name/status/lastUsedAt/expiresAt/revokedAt/createdAt`，永不返回 plaintext/tokenHash/secret/rotate 内部字段；`createdAt desc + id` 稳定排序；status 由现有数据推导（revoked/rotated/expired/active）；与 Frontend `validateTokenMetadata` 完全一致。
- 全部 13 条 Service Account Bearer 机器路由（ERP 7、MCP 2、CLI 4）显式携带 `requireMachineAccess → rateLimitServiceAccount → handler` 栈；认证严格先于限流，未认证请求保持 401 且绝不被限流；不再依赖 Hono 子应用 `use("*")` hoisting。
- 修复潜在缺口：四条 ERP upstream GET 路由此前未匹配任何认证前缀，任何调用者都 500；现已纳入同一机器栈。
- focused 真实证据：S08 09 token list 生命周期（create→list/rotate→list/revoke→list、七字段、401/403/404、排序）与 S08 10 ERP/MCP/CLI 429 + Retry-After（per-account ceiling 跨 token 共享、auth-before-limit、upstream auth）在 disposable PG16 上 10/10；Browser fixture 19/19 仅作为 UI against fixture 证据，与真实 Backend 证据分列。

## 7. Rate Limit

key 只使用认证后 principal 的 tokenId 或 serviceAccountId（`sa-token:<tokenId>` / `sa-account:<accountId>`），不得使用明文 Token；固定 1 分钟窗口复用现有持久化 `RateLimitBucket` 分布式接口；requestsPerMinute 为硬上限；稳定 429 public error 与 `Retry-After` 秒数；rotate overlap 期 per-account 模式共享账户 bucket、per-token 模式新旧 Token 各自 bucket 且总账户安全上限仍生效；未认证请求使用既有 IP/auth 防护，不泄漏 Token 是否存在；多实例一致性不能用单进程内存冒充——若持久化基础不足，consumer 必须诚实 degraded 并阻塞 ERP Limited Release 而非阻塞 S08。

## 8. Audit 与 Invocation 读模型

- 冻结并实现一个安全读模型：Service Account 业务 Audit、machine API 调用 Audit、invocation list/detail、lastUsedAt、failed authentication（按 policy）、retention 与 redaction。
- `McpToolInvocation` 与 `AuditLog` 保持各自事实，不复制整表；UI 使用安全聚合 adapter。
- invocation list/detail 默认字段：`id / serviceAccount{id,key,name} / toolKey / status / createdAt` + 白名单安全错误分类；原始 `input/output/error` 默认不返回；未知字段 fail closed。
- failed authentication 由 AuditLog 承载安全 action/result/reason 分类，不复制到 McpToolInvocation，不记录凭据。
- `/dashboard/mcp/invocations` 前向改用 `service_accounts.manage`；全局 Audit 查询仍按既有 `audit_logs.read` 边界。

## 9. Readiness 消费者矩阵

| consumer | state | 说明 |
|---|---|---|
| token-lifecycle | future_obligation（冻结期） | create/expiry/max-active/require-expiry 必须真实接线才可 ready |
| rotate-overlap | future_obligation（冻结期） | 显式 rotate + 惰性失效，核心消费者 |
| machine-scope-enforcement | future_obligation（冻结期） | scope/environment 在机器边界执行，核心消费者 |
| rate-limit | implemented_ready | ERP/MCP/CLI 全部 13 条机器路由显式覆盖并有 focused 429 + Retry-After 证据；burst 保持 coverage_limited（阻塞 ERP Limited Release 仅） |
| audit-invocation-read-model | future_obligation（冻结期） | 安全读模型，核心消费者 |
| erp-product-api-machine | future_obligation（冻结期） | 永不退让；closurePackage=ERP Limited Release |

overall readiness 只在全部适用消费者 ready 时 ready；存在 rate-limit degraded 或 ERP future obligation 时诚实 degraded。

## 10. ERP 兼容边界

- Manifest 保持 `productContractFrozen=false`、`implementationComplete=false`、progress 0；stageRecord 只记录 S08 机器身份阶段；S06/S08/B01/F03 中仅 S08 阶段完成，其他 planned-only；
- 不发放真实 ERP 测试/生产凭据；不调用真实 ERP；不修改 ERP API v1 路径、字段、幂等、游标或 ownership；
- Token rotate 只改变凭据，不要求 ERP 改业务接口配置；不创建第二套 Token/认证/permission 体系。

## 11. 验收矩阵

- normal：projection 读取 → typed draft 校验 → 只读 impact preview → policy-only publish → exact-generation readiness/诚实 degraded → append-only history；
- failure：secret/token Settings 字段 blocker、TTL>365 blocker、ceiling/scope 违反 blocker、429+Retry-After、version/state/idempotency conflict、preview 零写入零回显；
- browser：面板渲染 current/default、draft 生命周期、create token 一次显示、rotate overlap、revoke、history/rollback、readiness 矩阵、invocation 安全视图、EN/fr 路由、a11y、0 unexpected console/requests。

## 12. Shared leases 与进度边界

- Service Account/Machine Authentication shared-contract 写租约仅 S08；P02/P04 只读；rate_limit_buckets 复用现有表；
- 功能进度 +1～2pp（68%–74% 上限，S08 贡献后）；集成 ≤98%–99%；发布仅在关闭实际前置时最多 +1pp；ERP overall progress 0。
- 不实施 S06/B01/F03；不推进 Main、部署或生产。

## 13. Authority Scan 一致性收口

- v2 产品功能结论不变；唯一 Authority 缺口是 `finalIdentity.gates.secretPiiPaymentScan` 仍为 `pending rerun`，同时 continuity/report 声称 clean。
- 对同一 22 文件范围（13 repo + 9 authority）执行 12 类高置信扫描：私钥、云密钥、live payment key、硬编码 `vsa_` Token、Bearer/JWT、带凭据数据库 URL、secret/password/token 字面量、邮箱、电话、IBAN、Luhn PAN。
- 首轮发现 `AI_OS projects/vanstro/tasks/handoff.md` 中 2 处同一生产管理员邮箱 PII；已以不可逆语义占位完成最小脱敏，不保留用户名、域名、首尾字符或部分掩码。
- 重扫：20 个原始候选全部归为良性（synthetic test credential 1、synthetic/test PII 1、numeric/hash 18），高置信敏感候选 0，结果 `clean`；任何敏感原值均未写入 Contract、报告、checkpoint、handoff、manifest 或聊天输出。
- static gate 强制扫描状态不得为 pending/pending rerun/not run 同义状态，且 Contract、protection manifest、最终报告必须一致；将字段改回 pending 的 negative mutation 必须失败。
