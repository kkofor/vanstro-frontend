# VanStro v1 S10 Privacy / Retention / Audit Settings — Implementation Contract

状态：`IMPLEMENTED_INTEGRATION_CERTIFIED`（实现、Integration 双亲合并与最终认证完成）
Claims：frozen / implemented / integrated / certified 全部为 true（Canonical JSON `claims` 与 static test 证明）
Authority：本契约随最终认证证据在 Integration 一次性提交（contracts + evidence + status assertions only，无产品代码变更）
认证基线：testedCommit `dad4ef63b1c6a15d39dcfa703e324a5d60a35242` / tree `4a78bcfbee157be13c37d820a94163ac37062991`
合并链（双亲）：`87af4685b623c8f34092d71fdb8b0e14ef8fbdc6`（87682ba + ff79840，Backend）→ `352e1214a179a5d229387b33488d12ab0cd6e59f`（87af468 + d972d21，Frontend）→ follow-ups `897e1e8`（allowlist 补充）、`dad4ef6`（类型修正）
migration77：`packages/db/prisma/migrations/20260807000000_s10_privacy_retention_settings/migration.sql`（77/77；1–76 不可变；无 78）
浏览器证据：`tasks/evidence/v1-s10-settings-browser/acceptance-results.json`（23/23，0 意外 console/request）
Canonical JSON：`tasks/contracts/v1-s10-privacy-retention-settings.v1.json`（本文件为其人读正文，语义与 JSON 一致并由 static test 证明）
Port：`cg01.privacy-retention.v1`（`tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json`）
Authority：`/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-s10-privacy-retention-settings-continuous-goal.md`（SHA-256 `72cc5c86382c7ae25ea520d7166e5e793261c28889d44d94e09a5ac79a505c40`）

## 0. 身份

- package：`S10`
- descriptor key：`settings.privacy-retention`
- settings schema：`settings.privacy-retention.v1`
- value type：object；secret：false；scope：global；mutable：true
- baseline Integration：`1d096b6dcdbcd634a99a9fe942ea5f32eb46cc8d` / tree `45830174b7f736912bf7be6559480a5acf16a28d`
- migrations：76；latest `20260806100000_s09_auth_rbac_settings`；无 77
- 依赖：S01、CG01 Port `cg01.privacy-retention.v1`；external baseline `P04`、`D17-current-facts`

## 1. Typed value shape — `PrivacyRetentionSettingsValueV1`

顶层 exact keys（六个字段族，均 required，未知 key reject）：

```ts
{
  consentPolicy: {
    anonymousConsentEnabled: boolean;        // current fact 默认 true（D17 consent-events POST 已上线）
    authenticatedConsentEnabled: boolean;    // future setting；capability = future_unavailable
    consentCategories: Array<"functional" | "analytics" | "targeting">; // 非空、唯一、1..3
    retentionMonths: number;                 // 6..120，默认 24（CONSENT_RECORD_RETENTION_MONTHS）
  };
  retentionPolicy: {
    retentionByObjectFamily: Array<{
      objectFamily: "consent_events" | "audit_events" | "async_jobs" | "media_assets" | "orders" | "payments" | "privacy_requests";
      retentionDays: number;                 // 30..7300
      autoCleanupEnabled: boolean;           // 仅表达未来允许；执行需单独授权
    }>;                                      // 0..7，objectFamily 唯一
  };
  legalHoldPolicy: {
    legalHoldEnabled: boolean;
    legalHoldRefs: string[];                 // 0..64 UUID；enabled=true 时必填
  };
  dsarPolicy: {
    accessExportDeleteRules: Array<{
      scope: "all_personal_data" | "orders" | "payments" | "media" | "communications";
      method: "access" | "export" | "delete";
      enabled: boolean;
      requireAdminApproval: boolean;         // method=delete 时必 true
    }>;                                      // 0..15
  };
  piiDisplayPolicy: {
    piiDisplayRules: Array<{
      field: string;                         // 1..80，合法标识符
      displayMode: "plain" | "masked" | "hidden";
      allowedRoles: string[];                // 1..8 role keys
    }>;                                      // 0..20
  };
  lowRiskExecution: {
    allowlist: string[];                     // ⊆ {consent_events, async_jobs}，唯一，0..2
    impactPreviewEnabled: boolean;           // 默认 true
  };
}
```

- 六字段族均 required；未知 key reject；未知 objectFamily / scope / displayMode / method reject。
- 所有整数边界为唯一事实源（structural 校验）；越界或无法形成唯一有效值 → validate 返回 blocker；publish 禁止；consumer 回退 compiled defaults。

## 2. Current facts 与 precedence（只读投影）

| 事实 | 值 | 来源（blob/符号） | 分类 |
|---|---|---|---|
| anonymous consent | POST `/privacy/consent-events` 已上线（functional/analytics/targeting 偏好） | `apps/api/src/routes/privacy.ts`（blob `2cf0002790edab7526d8bfcd0653bf2128fefd08`） | `current_fact` |
| consent 记录保留 | `CONSENT_RECORD_RETENTION_MONTHS=24`；`deleteExpiredConsentEvents`（Worker 执行） | `packages/db/src/privacy-retention.ts`（blob `4f5d2ccb3a362250c7cf1d32c7692d9297ef9792`） | `current_fact` |
| 数据保留天数 | `DATA_RETENTION_DAYS`：pageViews 90 / loginEvents 365 / completedEmailPayloads 90 / completedErpAttempts 180 / processedWebhookPayloads 180 / expiredPaymentSessions 90 / rateLimitBuckets 2 | `packages/db/src/data-retention.ts`（blob `4c5cabcc30db6dc9b8bcffff87f1b1c713ea4115`） | `current_fact` |
| Audit 保留 | `audit-retention.v1`；`expiresAt = occurredAt + 2555 days` | `apps/api/src/audit/foundation.ts`（blob `af8be646c83264ad41be3f4e925501c72a94654e`） | `current_fact` |
| Media legal hold | `legalHold Boolean @default(false)`（无管理写路径） | `packages/db/prisma/schema.prisma`（blob `7078a1344490c29a564f5ba5c3f10b60b4770ab0`） | `current_fact` |
| Worker retention job | `apply-data-retention` job type 存在（应用 DATA_RETENTION_DAYS + consent 清理） | `apps/worker/src/index.ts`（blob `d0e5f9792eaf922c7a9435129230e8e6568c68b8`） | `current_fact` |
| Audit/async-job expiry cleanup consumer | **缺失**：无完整 cleanup consumer 或计划 job type | CG01 `currentProjection.gap` | `implementation_decision_required` |

### Capability layering（不得冒充当前可执行）

- anonymous consent：`current_fact`，可只读投影并配置未来 policy。
- authenticated consent：`future_unavailable`（authority object=current_fact，ts producer/consumer/worker path=absent）。
- privacy subject purge：`future_unavailable`（ts create/claim/report=absent）。
- legal hold：只读事实与 policy 引用，不修改实例。
- DSAR：只配置规则，不执行请求。
- low-risk allowlist：仅表达未来允许对象族，不触发执行。
- impact preview：只读、安全聚合、无 PII、无逐行 target。

## 3. 生命周期

复用 S01/S01B append-only 生命周期与 S02/S09 descriptor 隔离：

- states：draft / invalid / validated / activation_failed / published / superseded
- draft CAS：resource-local settingsRevision
- expectedPublishedVersion：descriptor-scoped publicationSequence（由 current projection 暴露）
- idempotency：exact replay or conflict（s10 独立 operation family）
- history：append-only `s01_settings_publication_event`，descriptorKey 分区
- rollback：新 draft + 新 publication，不重写历史；**不得声称恢复已删除/匿名化数据**
- publish + Audit + ledger + history 原子；`partialPublish=false`

## 4. draftValidation

- structural：exact keys、整数边界、枚举、JSON 深度/大小、禁止 PII 值/consent payload/secret/token/cookie/hash 值字段。
- business blockers：
  - `retentionMonths` <6 或 >120；
  - `retentionDays` <30 或 >7300；
  - 高风险对象族（audit_events / media_assets / orders / payments / privacy_requests）`autoCleanupEnabled=true`；
  - `legalHoldEnabled=true` 且任一 `autoCleanupEnabled=true`（hold 冲突）；
  - `legalHoldEnabled=true` 且 `legalHoldRefs` 为空；
  - `legalHoldRefs` 非 UUID 或超 64 条；
  - `lowRiskExecution.allowlist` 含非候选族（仅 consent_events / async_jobs 候选）；
  - `retentionByObjectFamily` objectFamily 重复或含未知族；
  - DSAR `method=delete` 且 `requireAdminApproval=false`；
  - `piiDisplayRules.allowedRoles` 空、超 8 或含未知 role key；
  - `consentCategories` 空、重复或含未知类别。
- warnings：`authenticatedConsentEnabled=true`（当前不可执行）；任一 `autoCleanupEnabled=true`（需单独授权）；retentionDays 低于该族当前 Worker 常数（如适用）。
- unknown fields reject；错误族 400/401/403/404/409 稳定。

## 5. publishAdapter（零执行副作用）

- publish 只激活版本化有效 policy，并原子写 publication、Audit、ledger、history。
- publish、rollback、validate、preview 均不得执行：delete、anonymize、archive、purge、legal-hold 实例变更、PrivacyRequest 状态变更、Worker job 创建或调度。
- 不作用于任何业务数据实例（Orders、Payments、Audit、Media、consent events、privacy requests）。
- policy rollback 只创建新 draft/publication，不能恢复已删除或匿名化的数据；真实 delete/purge 需未来单独明确授权。
- consumer direction：S10→B09（未来 B09 消费已发布 policy；S10 不等待 B09）。

## 6. readinessAdapter

- 无副作用；`publishedGeneration` 与 consumer generation 精确匹配继承 S01 语义（作为字段报告）。
- **cleanup consumer 缺失时：state 恒为 `degraded`，reasonCode `cleanup_consumer_unavailable`**；即使 generation 精确匹配也不得 `ready`（诚实正常状态，不是 fake-ready；不阻断 draft/publish/history 功能）。
- 附加 degraded reason：hold conflict（published policy 若存在）、P04 dependency unavailable。
- 未来低风险 cleanup Job 必须单独授权，并有独立对象 allowlist、dry-run、hold 检查和回滚边界。

## 7. Role/影响 impact preview（独立无副作用操作）

- `POST /dashboard/settings/s10-impact-preview`，permission `settings.read`
- request exact keys：`candidateRetentionEntries`（可选，`{objectFamily, retentionDays, autoCleanupEnabled}` 列表，0..7）+ `candidateAllowlist`（可选，0..2）
- response：`wouldEnableAutoCleanup`、`wouldConflictWithLegalHold`、`blockedHighRiskFamilies`、`affectedFamilies`（`{objectFamily, classification: "low_risk"|"high_risk", wouldEnableAutoCleanup}`）、`contextRevision`
- 实现：事务内只读校验候选变更（复用真实 hold/high-risk/allowlist 不变量）；只返回聚合影响；无 PII、无逐行 target、无计数明细。
- 禁止：任何业务/Audit/job 写；PrivacyRequest/consent/Audit/Media 状态变更。

## 8. Routes

生命周期（复用 settings.read/settings.write）：

```text
GET  /dashboard/settings/s10-overview
GET  /dashboard/settings/s10-drafts
POST /dashboard/settings/s10-drafts
GET  /dashboard/settings/s10-drafts/:id
PATCH /dashboard/settings/s10-drafts/:id
POST /dashboard/settings/s10-drafts/:id/validate
GET  /dashboard/settings/s10-drafts/:id/diff
POST /dashboard/settings/s10-drafts/:id/publish
GET  /dashboard/settings/s10-history
POST /dashboard/settings/s10-history/:publicationId/rollback-draft
GET  /dashboard/settings/s10-readiness
POST /dashboard/settings/s10-impact-preview   (settings.read)
```

错误族：400 `SETTINGS_VALIDATION_FAILED`；401 `AUTH_REQUIRED`；403 `DASHBOARD_FORBIDDEN`；404 `SETTINGS_DESCRIPTOR_UNAVAILABLE`；409 `VERSION_CONFLICT`/`IDEMPOTENCY_CONFLICT`/`SETTINGS_STATE_CONFLICT`/`LEGAL_HOLD_CONFLICT`。

## 9. AuditDescriptor

- operation：`settings.publish`、`settings.rollback`（S10 family）
- resource：`settings.privacy-retention`
- permission：现有 `settings.write`（无新 permission）
- 真实 P02 occurrence-time snapshot；safe metadata 仅 `descriptorKey`/`schemaVersion`/`publicationSequence`/`changeReason`
- secret/PII denylist：PII 值、consent payload、deletion/anonymization target、cookie secret、session token/hash、Authorization header、database credential、encryption key、password/hash/salt、reset token
- retention：继承 P04 `audit-retention.v1`（expiresAt occurredAt+2555d）；policy publish 的不可逆性记录在 changeReason/metadata

## 10. Migration 77 边界（Backend 唯一 owner）

- 路径：`packages/db/prisma/migrations/20260807000000_s10_privacy_retention_settings/migration.sql`
- 允许：`s10_*` 受控函数族；`settings.privacy-retention` 独立 lock 域；`settings_command_operation_check` 前向扩展（追加 `s10_*` 五操作）；`settings_core_shape_check` 前向扩展；`runtime_config_registry` descriptor allowlist 前向扩展；policy/current projection、impact preview、readiness；安全 GRANT/REVOKE；尾部 post-assertions；所有 INSERT 显式 `gen_random_uuid()`。
- 禁止：修改 migrations 1–76；`CREATE OR REPLACE` s01_*/s02_*/s09_* 函数；重写 auth session 状态机；新建 privacy/Audit 重复事实表；实现 S11/S12/B09；存储 PII/secret/deletion target；任何 delete/anonymize/archive/purge 数据操作。
- 协调：S10 落地 migration77 时前向更新 `scripts/s02-migration75-static.test.mjs` 与 `scripts/s09-migration76-static.test.mjs` 的迁移计数断言为 count=77/no-78。

## 11. Shared file leases

- Integration freeze：本契约 MD/JSON
- Backend/S10：`apps/api/src/dashboard/access.ts`（追加 s10 规则）、`apps/api/src/dashboard/s10-settings.ts`、`apps/api/src/routes/dashboard.ts`（挂载）、`apps/api/src/public-errors.ts`（如新增错误码）、`packages/db/src/s10-settings-controlled.ts`、`packages/db/src/index.ts`（导出）、migration77、`scripts/test-api-regular-pg16.sh`（S10 段）
- Frontend/S10：`src/lib/api/api-contract.ts`、`src/lib/api/runtime-validation.ts`、`src/lib/dashboard/s10-settings.ts`、`s10-settings-transport.ts`、`s10-settings-readiness-consumer.ts`、`PrivacyRetentionSettingsPanel.tsx`、`DashboardF0Shell.tsx`、`DashboardF0ReadOnlyContent.tsx`、EN/FR `[view]/page.tsx`、`src/lib/i18n/routes.ts`、UI-0 allowlist 扩展
- P04/Audit 写：S10 只读消费；migration77：S10 独占

## 12. 验收矩阵

- normal：compiled defaults 投影（含 future_unavailable 标注）；create/update/validate/diff/publish；impact preview 只读聚合；readiness 恒 degraded（cleanup_consumer_unavailable）；history 与 rollback-as-new-publication；六字段族 typed 编辑。
- failure：invalid retention/hold 冲突/高风险 auto-cleanup/DSAR 无审批/未知族 → blocker；malformed UUID；stale version 409；idempotency conflict；401/403/404/409/400；consumer generation mismatch 报告；secret/PII denylist。
- zero-side-effect：publish/rollback/validate/preview 前后业务表（Orders/Payments/Audit/Media/consent/privacy requests）零变化；无 job 创建。
- browser：current/future capability 投影；typed 编辑；safe diff 与 preview 无 PII/逐行 target；publish 只激活 policy；Audit/history 存在且 metadata 安全；degraded 绝不 fake-ready；authenticated consent/purge 显示 future unavailable；rollback 不声称恢复数据；keyboard/focus/loading/error/empty；logout/post-logout；0 unexpected console/request。

## 13. 范围

- in：Privacy/Retention/Audit Settings 生命周期；future policy consumer 声明（B09）；只读 impact preview；desktop Settings 页面（EN/fr 静态路由）；cleanup consumer 缺失的诚实 degraded 状态。
- out：自动 delete/anonymize/archive/purge；真实 DSAR 删除；自动清理 Orders/Payments/Audit/Media legal-hold 对象；新 cleanup Job 或调度器；把 authenticated consent/purge 冒充当前可执行；修改 PrivacyRequest/consent/Audit/Media 实例状态；P04 provenance/ACL 安全治理；secret 或 PII 回显；修改 S09 RBAC contract；修复既有 v2 项；S11/S12/B09；Main、生产或外部副作用。
