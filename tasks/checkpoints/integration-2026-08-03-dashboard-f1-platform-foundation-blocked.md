# Integration — F1 Platform Foundation BLOCKED

## 结论

F1 在只读恢复、P10 前置复核和跨 Foundation 审计阶段停止。当前 `f96bb80e9b024352408372440d803072980dbe43` 不能认证为 F1 stable baseline，也不能维持“P10 无安全缺口”的新一轮复核结论。

未进入 Stage C，未部署，未访问或迁移生产数据库，未创建 migration 69。

## 恢复与并发审计

- 接管文件 SHA-256：`2c5a82b32112459893e6a3f06a881291ea7700537368108253e697b46d10b35f`。
- F1 授权文件 SHA-256：`ab2cd70ad5feed2650fd82016b69ed46e0e64afc4f294af0915045b4260ece11`。
- PID 2557 是 AI_OS 只读/计划辅助会话；PID 25474 属于其他项目，均不写标准源码 worktree。
- 除当前总协调 PID 54457 外，没有 Claude/Agent 位于四个标准源码 worktree；Backend/Frontend 只有空闲 shell，没有相关 Agent、测试、Prisma、Playwright、Next 或 disposable DB 任务。
- Main、Integration、Frontend、Backend 均为 `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`；标准 worktree tracked clean，未发现未接收领域 commit 或 F1 落盘成果。
- Main protected untracked 按既定 newline porcelain 算法为 80 records，SHA-256 `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`；stash object `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`。

## P10 前置事实

- Contract path：`/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p10-analytics-event-metric-foundation-contract-v1.0-20260803.md`。
- Contract：FROZEN v1.0，98 LF lines，10741 bytes，SHA-256 `c813cd83a526f669aaf39781fa35aa40b32883ffe99d21dc46d843ef868784f9`。
- migration68 SHA-256：`2cf72cadb5c560d221acfdcf7b85fd2a616d915ada54311ca10572fa8b12dbe4`；source migrations 68；无 migration69；production 仍按持久证据为 41，未访问。
- P10 browser v2 durable result仍为14/14，result SHA `65c6c1e6ed3e9abce8a1e75783de186d0c7be37fbaf2b8ea6fc0a7f80ce952f8`，tested commit `acc225529db913536a3d4a3775862ff953e6b3f5`。
- 本轮按认证配置重跑 Static：404/404 Next pages，localization后401 expected HTML；fr-CA 199；SEO 398/308/140/300；404、Careers/Contact privacy和protected artifacts通过。
- Package contracts 201/201、全栈 TypeScript、Backend builds、Prisma generate通过；Prisma validate首次因缺 `DATABASE_URL` 配置失败，使用不连接数据库的占位URL重跑后通过。
- migration68 harness实际执行并通过0/55/62/64/65/66/67→68；但下述证据错位使该通过不能认证P10权限闭环。

## 阻断 1：P10 低基数抑制可绕过

Frozen Contract要求 small cohorts `<3` 在detail中抑制，summary不得返回可推断count。

当前实现：

1. `GET /dashboard/analytics/foundation/events` 对exact scope过滤后直接返回最多50条individual rows，包含event ID、resource ID、时间、dimensions和late状态；1或2条cohort没有suppression。
2. `engagement_rate`只按`filtered.length`判断suppression。无category时`filtered === all`；总事件数大于等于3但engage numerator为1或2时返回精确比率，可反推出低基数numerator。

证据：`apps/api/src/dashboard/analytics-foundation.ts:9-11`；Contract：`dashboard-p10-analytics-event-metric-foundation-contract-v1.0-20260803.md:48-54`。

这是scope/field visibility信息泄漏，触发F1停止条件。需要Backend领域前向代码/测试修复；预计不需要schema，但必须重新验证0/1/2/3、numerator/denominator、category/total差分和cross-scope矩阵。

## 阻断 2：P08 Job payload生产者与严格validator不一致

- Import commit route提交payload字段`mode`，而P05严格validator要求`commitMode`。
- Export create route提交`querySnapshotHash`，而严格validator要求`querySnapshotRef`。
- `createAsyncJob`在持久化前调用该validator，因此合法授权请求会以`JOB_PAYLOAD_INVALID`失败，无法创建`dashboard.import.commit`或`dashboard.export.generate` Job。

证据：

- `apps/api/src/dashboard/data-jobs.ts:342-364`
- `apps/api/src/dashboard/data-jobs.ts:386-413`
- `packages/db/src/async-jobs.ts:61-68`

这是跨P05/P08真实产品路径阻断，需要Backend领域修复并补真实API/owned回归。

## 阻断 3：migration68 harness的P10权限断言错位

脚本确实部署0/55/62/64/65/66/67→68，但`verify()`和direct SQL denial只检查P09的`runtime_config_version`、`feature_flag_version`及`p09_%`函数，输出仍写`target=65`。它没有证明：

- `analytics_foundation_event`四动词拒绝；
- P10 guard owner属性和membership；
- migration67旧`p10_ingest_event`最终不可执行；
- `p10_ingest_event_v2`唯一runtime入口、owner、SECURITY DEFINER、fixed search_path、PUBLIC revoke；
- 67→68升级后的accepted/replay/conflict/denied/Audit rollback行为。

证据：`scripts/test-permission-migration68.sh:32-72`。

现有P10 behavior test证明部分业务语义，但不能替代每条升级lineage上的role/grant/old-overload matrix。需要Backend测试修复；不应创建migration69来修复测试证据。

## 阻断 4：P10/P09 runtime读路径与撤权表不相容

- migration67从`vanstro_runtime`撤销`analytics_foundation_event`全部表权限；migration68仅给guard owner表权限。
- 但P10 events list与metric detail仍使用Prisma直接读取`analyticsFoundationEvent`。在真实runtime role下这些GET会因数据库权限失败，而不是返回已认证DTO。
- P10 v2 ingestion只在数据库中验证session actor拥有全局role permission，却信任调用者传入的scope kind/Dealer/Location/context/scope fingerprint，没有从P02 membership/grant事实重建或校验exact scope；持有shared runtime DB role的调用方可直接伪造scope参数。
- migration66同样从`vanstro_runtime`撤销`worker_heartbeats`全部表权限；P09 readiness仍使用Prisma `workerHeartbeat.findMany`，且`SOURCE_LATEST_MIGRATION`仍硬编码migration65。因此最终readiness无法真实观察migration66 lifecycle authority，并可能将最新source migration状态误报。
- API和Worker生产Compose共用同一runtime数据库凭据，而`p09_worker_startup/heartbeat/transition`授予shared `vanstro_runtime`；当前数据库边界无法区分API与Worker调用者，API runtime身份可伪造Worker lifecycle/capacity。是否采用独立Worker DB role或不可伪造Worker capability必须正式决策。

证据：`packages/db/prisma/migrations/20260803140000_dashboard_p10_analytics_foundation/migration.sql:18-21`、`apps/api/src/dashboard/analytics-foundation.ts:9-11`、`packages/db/prisma/migrations/20260803130000_dashboard_p09_worker_lifecycle_authority/migration.sql:34-38`、`apps/api/src/readiness.ts:4,18-47`。

修复需要受控scope-bound read/aggregate functions以及P09安全观察函数。由于这涉及DDL/function/grant，形成明确的migration69最小需求；本轮按授权边界停止，不创建migration69。

## 阻断 5：P08 upload token永不匹配

Import create生成随机`token`返回客户端，但写入数据库的`uploadTokenHash`是actor+Idempotency-Key的`keyHash`，不是返回token的hash。PUT随后用`tokenMatches(token, batch.uploadTokenHash)`验证，因此正常客户端拿到的token必然不能匹配数据库值，controlled PUT无法完成。

证据：`apps/api/src/dashboard/data-jobs.ts:217-224,230-232,271-272`。

这是独立于Job payload mismatch的P08真实产品阻断，需要Backend领域修复及真实API/owned/browser路径重验。

## 阻断 6：Frozen Contract authority未闭合

- P09 frozen v1.0 SHA `0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de`仅授权migration65并明确禁止migration66；最终completion在不版本化Contract的情况下采用migration66。
- P10 frozen v1.0 SHA `c813cd83...`明确只允许migration67并写“No migration68”；最终completion在保持同一Contract SHA时采用migration68。

测试通过不能替代持久、版本化authority。F1要求authority唯一且无互斥，因此需要正式erratum/new Contract authority；不得改写原frozen文件。

## 其他证据缺口

- P10-A09名为“PII secret absent DOM network”，实际只扫描DOM字符串；network仅记录method/URL，未扫描request/response body、headers、cookies、Authorization或storage，存在断言名称超出覆盖范围。
- owned DB/API/Worker原始TAP默认写入`${TMPDIR}`，仓库只有摘要count，缺少durable sanitized inventory、case-level regular-skip→owned mapping和raw-result hashes。
- F1 canonical test inventory与真正cross-Foundation browser harness尚不存在；P08/P09/P10独立fixture不能替代最终F1 lineage的统一browser acceptance。
- 本轮regular DB首次84 discovered / 47 pass / 36 gated / 1 fail，唯一失败为P07 timing断言；该case随后独立连续10/10通过，第二次regular DB为48 pass / 36 gated / 0 fail。后续API因Integration worktree没有root `.env`而在配置bootstrap失败，未构成有效API结果。F1已因产品blocker停止，未继续伪造完整green gate。

## 已停止/未执行

- 已停止仍在运行的owned harness与Chromium任务，并确认无相关进程或容器残留。
- 未创建Backend/Frontend产品修复，未在Integration越界修改产品代码。
- 未创建F1 browser assets、authority ledger final artifact或最终evidence commit。
- 未更新/改写历史P10完成checkpoint；本文件前向记录新复核结论。
- 未fast-forward任何标准分支；四线仍在`f96bb80...`。
- 未push、fetch、PR、stash、reset、rebase、clean或清理历史Agent worktree。

## 下一步所需独立工作

1. 冻结独立P09/P10 Contract erratum或新版本，正式授权已采用的migration66/68并记录兼容性；不得改写原frozen字节。
2. Backend标准worktree修复P10低基数抑制、差分推断、scope/context数据库绑定和runtime受控read/aggregate路径。
3. Backend标准worktree修复P08 upload token hash、producer/validator payload契约并补真实API/owned路径。
4. Backend标准worktree修复migration68 P10权限/overload/upgrade矩阵。
5. migration69最小需求至少包括P10 scope-bound read/metric函数与P09 Worker lifecycle安全观察函数；是否同时引入API/Worker分离DB role必须由独立安全决策确定。migration69必须另行授权，本轮不自动创建。
6. 正常双亲Integration merge后，从F1最终lineage重跑regular/owned/critical、cross-Foundation、authenticated F1 browser、Static和Chromium，并保存durable evidence。

`production deploy: deferred until full Dashboard completion`
