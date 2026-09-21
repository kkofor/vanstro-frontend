# VanStro v1 S09 Auth / Sessions / RBAC Settings — Implementation Contract

状态：`IMPLEMENTED_INTEGRATION_CERTIFIED`（S09 已实现、migration76 已集成、Backend/Frontend 领域 commit 已正常 merge、Integration 最终认证完成；本文档为 S09 最终 frozen/implemented/integration-certified contract）
Canonical JSON：`tasks/contracts/v1-s09-auth-rbac-settings.v1.json`（本文件为其人读正文，语义与 JSON 一致并由 static test 证明）
Port：`cg01.auth-rbac.v1`（`tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json`）
Authority：`/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-s09-auth-rbac-settings-continuous-goal.md`（SHA-256 `6d8e9756616bc926ba0f7ee95965c40d228b28d09403704f526125dbe5152ec5`）

## 0.0 最终状态（authority closure 前向更新，2026-08-06）

- Backend 最终 commit：`a30598db4ec5015c87a57479fb4fe04295dd757f`（feature/backend：`1444137` → `b26d945` → `a30598d`）
- Frontend 最终 commit：`5c3c0f12c8bf15bb3f0e052af5b52a9a260319b0`（feature/frontend：`5737f78` → `78df908` → `3c68096` → `5c3c0f1`）
- Integration 最终 commit：`8ac3ad08d266498c1b9ecb01bb596425f6b86316` / tree `460ca2a0d3ba584f3d97e26a56d42e159340ffa8`
- Integration merge chain（全部正常 `--no-ff` 双亲）：`1922620`（Backend）、`c936c07`（Frontend）、`f1164e4`（UI-0 allowlist 扩展）、`8ac3ad0`（注释语法修复）
- Migration 76：`packages/db/prisma/migrations/20260806100000_s09_auth_rbac_settings/migration.sql`（唯一 owner Backend/S09；migrations 1–75 不变；无 77）
- 关键门禁：独立 Review `0 Blocker / 0 High`（2 Low 已修复 `a30598d`）；真实 PG16 `29/29`（S09 15 + S02 14）；S09 Browser `23/23`（unexpected console=0、unexpected requests=0）；ui0-contracts `24/24`；package-contracts `271/271`；migration static `9/9`
- Browser evidence：`tasks/evidence/v1-s09-settings-browser/acceptance-results.json`（SHA-256 `dd40304ea6cfb0f71ad6fdcf25a3feda2523773815632203858ef33fd102404e`，testedCommit `8ac3ad08d266498c1b9ecb01bb596425f6b86316`）
- 本文档状态自 `FROZEN_CONTRACT_ONLY` 前向更新；typed schema、TTL authority、consumer、revoke、Audit、migration 边界、scope 与验收技术内容未改变。

## 0. 身份

- package：`S09`
- descriptor key：`settings.auth-rbac`
- settings schema：`settings.auth-rbac.v1`
- value type：object；secret：false；scope：global；mutable：true
- baseline Integration：`68df75567899f976f4480a2f4822cbd75ee0f69b` / tree `ef328047fd5bc58c8b7b67f0706658b0100f6510`
- migrations：75；latest `20260805120000_s02_general_storefront`；无 76
- 依赖：S01、CG01 Port `cg01.auth-rbac.v1`；external baseline `P02-current-facts`

## 1. Typed value shape — `AuthRbacSettingsValueV1`

顶层 exact keys（两个字段族，均 required，未知 key reject）：

```ts
{
  passwordPolicy: {
    minimumLength: number;        // 12..128，默认 12
    resetTokenTtlMinutes: number; // 5..31，默认 30
  };
  sessionPolicy: {
    sessionLifetimeMinutes: number; // 15..11520，默认 10080
  };
}
```

- `hashAlgorithm`（`pbkdf2_sha256`）、`iterations`（310000）、`hashLengthBytes`（32）、`rotateOnRefresh`（true）、`reusePolicy`、cookie flags：**只读投影**，不可编辑（当前系统无对应可执行开关，不得发明）。
- 所有 TTL 统一单位 `minutes`；`sessionLifetimeMinutes` 默认 10080（= 7 天 TS 默认），SQL 安全上限 11520（= 8 天）；`resetTokenTtlMinutes` 默认 30（TS 默认），SQL 容差上限 31。7d/8d 与 30m/31m 差异按 CG01 记录为 TTL authority 不一致，S09 契约记录而不修改历史 auth SQL。
- 越界或无法形成唯一有效值 → validate 返回 blocker；publish 禁止；consumer 回退 compiled defaults。

## 2. TTL authority（唯一事实源）

| 规则 | 值 | 来源 | 边界 |
|---|---|---|---|
| session default | 10080 min（7d） | `apps/api/src/auth/session.ts` `SESSION_TTL_MS` | 无 publication 时的 compiled default |
| session SQL ceiling | 11520 min（8d） | `auth_authenticate_create_session_v1`/`auth_rotate_session_v1` | 硬安全上限，非默认 |
| reset default | 30 min | `apps/api/src/routes/auth.ts` `PASSWORD_RESET_TTL_MS` | 无 publication 时的 compiled default |
| reset SQL ceiling | 31 min | `auth_issue_password_reset_v1` | 硬容差上限，非默认 |

## 3. currentProjection（只读事实）

- passwordPolicy：minimumLength 12；hashAlgorithm `pbkdf2_sha256`；iterations 310000；hashLengthBytes 32（只读）。
- sessionPolicy：sessionLifetimeMinutes 10080；rotateOnRefresh true（只读）；revokePolicy `explicit_only`；existingSessionRetroactivity false。
- deploymentImmutable：cookie 名 `__Host-vanstro-session`（deployment）/ `vanstro-session`（development）；`Path=/`；HttpOnly；deployment 下 Secure；SameSite=Lax；token 仅存 hash；secret status 不投影。
- rolePermissionImpactPreview：enabled true；scope global；lastAdminGuard `assertLastSuperAdminPreserved`；零写入。

## 4. 生命周期

复用 S01/S01B append-only 生命周期与 S02 descriptor 隔离：

- states：draft / invalid / validated / activation_failed / published / superseded
- draft CAS：resource-local settingsRevision
- expectedPublishedVersion：descriptor-scoped publicationSequence（由 current projection 暴露）
- idempotency：exact replay or conflict（s09 独立 operation family）
- history：append-only `s01_settings_publication_event`，descriptorKey 分区
- rollback：新 draft + 新 publication，不重写历史
- publish + Audit + ledger + history 原子；`partialPublish=false`

## 5. draftValidation

- structural：exact keys、整数边界、JSON 深度/大小、禁止 secret/token/cookie/hash 值。
- business blockers：minimumLength <12 或 >128；resetTokenTtlMinutes <5 或 >31；sessionLifetimeMinutes <15 或 >11520；TTL 无法唯一表示；impact preview 将违反 last-admin guard。
- warnings：session lifetime 低于 compiled 7 天默认；minimumLength 高于当前 12。
- unknown fields reject；错误族 400/401/403/404/409 稳定。

## 6. publishAdapter 与 effective-policy consumer

- publish 只激活版本化有效策略；零副作用。
- 仅影响未来注册、未来 password-reset 签发、未来 login、未来 refresh/rotation。
- 不作用于 existing session、existing credential、Role 实例、Permission 实例。
- 禁止：session create、session revoke、Role/Permission 变更、password rehash、cookie secret 变更。
- consumer：只读版本化 resolver；无有效 publication 时 compiled defaults；login/refresh 各解析一次；返回所消费的 publicationSequence。

## 7. readinessAdapter

无副作用；`publishedGeneration` 与 consumer generation 精确匹配才 ready；缺失/不匹配/policy invalid/DB/P02 不可用 → degraded；绝不 fake-ready。

## 8. Role/Permission impact preview（独立无副作用操作）

- `POST /dashboard/settings/s09-impact-preview`，permission `settings.read`
- request exact keys：`targetUserId` + `nextStatus?`/`removeRoleId?`（至少一个变更）
- response：`targetUserId`、`wouldBlockLastSuperAdmin`、`activeSuperAdminCount`、`safeReasonCode`、`contextRevision`
- 实现：事务内只读调用 P02 authority 与 `assertLastSuperAdminPreserved`；预期的 guard 拒绝作为 preview 返回，绝不提交。
- 禁止：User/Role/Permission 写、session create/revoke、Audit 写。

## 9. Explicit session revoke（独立业务动作）

- `POST /dashboard/settings/s09-session-revoke`，permission `sessions.revoke`
- request exact keys：`targetUserId`、`reason`（8..500）、`confirmation`（必须等于 `REVOKE_SESSIONS`）
- 实现：`auth_admin_revoke_user_sessions_v1`（经 `authAdminRevokeUserSessions`）
- 与 draft/validate/publish/history/rollback 完全分离；rollback 不得复活已撤销 session。
- Audit：action `session_revoke`、resourceType `user`、metadata 仅 `targetUserId`/`reasonCode`、真实 P02 occurrence-time snapshot；denylist 含 session token/hash、cookie、Authorization header、password hash。

## 10. Routes

生命周期（复用 settings.read/settings.write）：

```text
GET  /dashboard/settings/s09-overview
GET  /dashboard/settings/s09-drafts
POST /dashboard/settings/s09-drafts
GET  /dashboard/settings/s09-drafts/:id
PATCH /dashboard/settings/s09-drafts/:id
POST /dashboard/settings/s09-drafts/:id/validate
GET  /dashboard/settings/s09-drafts/:id/diff
POST /dashboard/settings/s09-drafts/:id/publish
GET  /dashboard/settings/s09-history
POST /dashboard/settings/s09-history/:publicationId/rollback-draft
GET  /dashboard/settings/s09-readiness
POST /dashboard/settings/s09-impact-preview   (settings.read)
POST /dashboard/settings/s09-session-revoke   (sessions.revoke)
```

错误族：400 `SETTINGS_VALIDATION_FAILED`/`AUTH_RBAC_CONFIRMATION_INVALID`；401 `AUTH_REQUIRED`；403 `DASHBOARD_FORBIDDEN`/`AUTH_SESSION_REVOKE_DENIED`；404 `SETTINGS_DESCRIPTOR_UNAVAILABLE`/`AUTH_RBAC_TARGET_NOT_FOUND`；409 `VERSION_CONFLICT`/`IDEMPOTENCY_CONFLICT`/`SETTINGS_STATE_CONFLICT`/`LAST_SUPER_ADMIN_CONFLICT`。

## 11. AuditDescriptor

- operation：`settings.publish`、`settings.rollback`、`session_revoke`
- resource：`settings.auth-rbac`、`user`
- settings permission：现有 `settings.write`；revoke permission：现有 `sessions.revoke`（无新 permission）
- 真实 P02 occurrence-time snapshot；safe metadata 仅 `descriptorKey`/`schemaVersion`/`publicationSequence`/`changedFields`/`targetUserId`/`reasonCode`
- secret denylist：cookie secret、session token/hash、Authorization header、database credential、encryption key、password/hash/salt、reset token

## 12. Migration 76 边界（Backend 唯一 owner）

- 路径：`packages/db/prisma/migrations/20260806100000_s09_auth_rbac_settings/migration.sql`
- 允许：`s09_*` 受控函数族；`settings.auth-rbac` 独立 lock 域；`settings_command_operation_check` 前向扩展（追加 `s09_*` 五操作）；`settings_core_shape_check` 前向扩展；`runtime_config_registry` descriptor allowlist 前向扩展；effective policy projection/readiness；安全 GRANT/REVOKE；尾部 post-assertions；所有 INSERT 显式 `gen_random_uuid()`。
- 禁止：修改 migrations 1–75；`CREATE OR REPLACE` s01_*/s02_* 函数；重写 auth session 状态机；新建 User/Role/Permission/session 重复表；存储 secret；S10 schema。
- 协调：S09 落地 migration76 时更新 `scripts/s02-migration75-static.test.mjs` 的 “no migration76” 断言为 count=76/no-77；`scripts/cg01-wave-a-settings-ports-static.test.mjs` 的迁移计数断言在 S02 后已历史过时（见 checkpoint 披露），Phase B 一并协调。

## 13. Shared file leases

- Integration freeze：本契约 MD/JSON
- Backend/S09：`apps/api/src/dashboard/access.ts`、`apps/api/src/dashboard/s09-settings.ts`、`apps/api/src/routes/dashboard.ts`、`apps/api/src/auth/session.ts`、`apps/api/src/routes/auth.ts`、`packages/db/src/s09-settings-controlled.ts`、`packages/db/src/p02-p04-runtime-controlled.ts`、migration76
- Frontend/S09：`src/lib/api/api-contract.ts`、`src/lib/api/runtime-validation.ts`、`src/lib/dashboard/s09-settings.ts`、`s09-settings-transport.ts`、`s09-settings-readiness-consumer.ts`、`AuthRbacSettingsPanel.tsx`、`DashboardF0Shell.tsx`、`DashboardF0ReadOnlyContent.tsx`、EN/FR `[view]/page.tsx`、`src/lib/i18n/routes.ts`
- P02/RBAC：S09 独占写租约；P04/Audit 写：S10 独占（S09 只读消费）；migration76：S09 独占

## 14. 验收矩阵

- normal：compiled defaults 投影；create/update/validate/diff/publish；consumer generation ready；新 login/refresh 使用 publication；impact preview 零写入；显式 revoke（权限+reason+confirmation）；history 与 rollback-as-new-publication。
- failure：invalid TTL blocker；last-admin preview blocker；malformed UUID；stale version 409；idempotency conflict；401/403/404/409/400；consumer generation mismatch degraded；secret denylist；无 `sessions.revoke` 时 revoke 被拒。
- rollback：仅新 policy publication；existing/revoked session 不变；无 Role/Permission 变更。
- browser：current/default/deployment 投影；draft 生命周期；safe diff；impact preview；publish/readiness；revoke 确认/reason；history/rollback；keyboard/focus/loading/error/empty；logout/post-logout；0 unexpected console/request。

## 15. 范围

- in：Auth/RBAC Settings 生命周期；未来 login/refresh policy consumer；只读 impact preview；显式 session revoke；desktop Settings 页面（EN/fr 静态路由）。
- out：MFA、SSO、passkey/WebAuthn、SCIM、password hash 迁移、新 permission、自动 Role/Permission 变更、Settings 创建 session、publish/rollback revoke session、S10、UI-1、v4、Main、生产。
