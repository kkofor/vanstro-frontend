> **Current truth — V11 Auth Browser lifecycle handoff (2026-08-16):** runId `20260816T051108Z-8e10921b`; HEAD `0b90cfa86ad73ab7ee942bff6780044016c19bd7`; TREE `01b35947d2c60ef9a838aab515cea4e43aa95c19`; 34-item matrix `31 pass / 3 not-executed (R2, B08, B10) / 0 fail`; `overallComplete=false`, `exitCode=1`。唯一剩余阻断：R2/B08/B10 需真人在 headed Chromium 执行真实 OS hidden→visible（`V11_LIFECYCLE_MODE=manual`，共 5 次：M5、B10、B08、R2 first、R2 second）。完整交接：`tasks/handoff/v11-auth-browser-lifecycle-handoff.md`；checkpoint：`tasks/checkpoints/integration-2026-08-16-0701Z-v11-auth-browser-lifecycle-handoff.md`。本轮只写交接，未改源码/测试/门禁；等待新会话执行 manual lifecycle 闭合。

> **Current truth — S01 Settings core complete (2026-08-05):** Integration tested commit `5aa513af1d25c8495471eb4df00f110b4013cfba`; source latest is migration73 `20260805100000_s01_settings_core`, SHA-256 `02693c77d5a3de29d529a49acb950922202eaa85b93058de7cbd599fd46aa053`. Contracts/API/DB/Worker/static/Chromium and desktop S01 Browser `15/15` are green; complete evidence is `tasks/checkpoints/integration-2026-08-05-v1-s01-settings-core-complete.md`. S01 is complete; Unified Settings remains incomplete until S02–S12. CG01 and S02 are not started. Main/production were not advanced. Wait for a new bounded prompt.

# VanStro Continuity Index

> **Current Integration truth (2026-08-04, Step3C authenticated evidence corrected):** QA commit `7352a8d...` now performs actual Jobs/Media/Audit detail interactions and exact per-case error/abort classification. Evidence commit `50a6b40...` records 11/11, raw/expected/unexpected console `10/10/0`, failed requests `9/9/0`, and all detail GETs 200 with visible safe fields. Read `tasks/checkpoints/integration-2026-08-04-v1-step3c-authenticated-evidence-closure.md`. Step3B Desktop Cross-Foundation 8/8 remains unchanged. No product/Main/production change; stop for a new prompt.

> **Previous Integration truth (2026-08-04, v1 Step3 desktop browser closure complete):** Dashboard v1 is desktop-only; historical F1-X07 remains failed and X07/X09/X10 are out of v1 scope. Integration QA `c51585b...` and evidence `a30edf5...` record Desktop Cross-Foundation `8/8` plus authenticated journey `11/11`, zero unexpected console/network failures. Frontend mobile experiment was archived as V3 candidate and precisely removed from the v1 product tree; docs-only Frontend commit `961e89f...` was not merged. Read `tasks/checkpoints/integration-2026-08-04-v1-step3-desktop-browser-closure.md`. No Main promotion or deploy; stop for a new prompt.

> **Previous Integration truth (2026-08-04, v1 Step3 incomplete):** Backend `d0d42dd30cb51b8e86efd2269fecee651bf71038` was normally merged as `bcb09b8ba352d6076b85310f3cd030846c8bc279`; Integration fixture follow-up is `d54dd83d9bb4625ffad2830dfbd60b683ec5b874`. Migration72 SHA is `461d1309...`, source count/latest 72. API/DB/Worker/contracts/type/build/Prisma/static/Chromium gates are green, but real Chrome Cross-Foundation is `10/11`: `F1-X07` mobile drawer focus behavior failed, and the complete required authenticated browser journey was not executed. Step3 is not complete; do not start the next feature step, promote Main or deploy. Read `tasks/checkpoints/integration-2026-08-04-v1-backend-functional-baseline-merged.md` and `tasks/handoff/integration.md`.

## Current canonical workspace

- 唯一活动业务仓库：`/Users/zhangguannan/Documents/codex/vanstro`
- **当前真相（2026-08-04，F1 v1.5 Implementation Authority Clarification FROZEN）**：双独立review绑定candidate `df0b5188f69f114a5c5eaa0cfc7fba71b659982acebbcdf17e9f3f44ebefd34a`；Contract `0B/0H/1M`、Security `0B/0H/0M`，唯一Medium已明确接受为无authority影响的产品实现验证后续。Package已前向标`FROZEN`并确定性重建，final manifest `68040ee6b95cdba8439cc4a733d124b7d518fb48a073ac093c2607bbcc7eb0f1`，21/21 members、frozen tests93/93、manifest tests6/6、semantic237、old68 exact31、SQL bodies30、owned PG16四阶段及反例全通过。未改产品/Prisma/产品tests/migrations1–68，未创建69/70/71或部署。证据：`tasks/checkpoints/integration-2026-08-04-f1-v15-implementation-authority-clarification-frozen.md`。
- **前一当前真相（2026-08-04，F1 v1.5 Authority Package FROZEN）**：三项硬决策已闭合；candidate manifest `20262d0ffca66c7352796d3de98634fa2dc792195c7eaa5c314bedc619b6d28c`的Contract/architecture/rollout与Security/privacy/database独立review均无Blocker/High，gates为25/25、tests56/56、semantic448。Package已前向标`FROZEN`并重建；checkpoint外部认证final manifest `e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f`。仅留Integration等待产品实现授权；未创建migration69/70/71、未推广三线或部署。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-authority-frozen.md`。
- **前一当前真相（exact CHECK/ACL/probe CLOSED；下一项 HARD BLOCKED）**：授权SHA `85b59d06a83d98a819b012afa3da6ce385be6a23469f769cfc79742cc7755da1`已闭合exact CHECK predicates、public-schema ACL、roles/membership/owners、逐对象privileges、69/70 operations及owned PG16 probe。Contract review曾发现old68 cancel兼容冲突，后由P08 Cancel决策关闭。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-check-acl-probe-next-hard-blocked.md`。
- **前一当前真相（v1.5 HMAC decision CLOSED；下一项 HARD BLOCKED）**：授权SHA `21fb4121ea844f2e22029ca28bfad29f8d1ca24e9431a987ace84ac07d3ace7d`已byte-exact冻结authenticated-subject HMAC/Consent并通过12个SQL/Node共同vectors。恢复持续Goal后稳定manifest `717420a552b40cdd8eb429f681b8a5b41d1ff60f25ce9414492b8920d9574b38`达到22/22、packaged tests 51/51、semantic 356 objects。但最终双review发现exact CHECK/ACL/probe硬决策。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-hmac-decision-next-hard-blocked.md`。
- **前一当前真相（v1.5 Continuous Goal HARD BLOCKED on P10 authority）**：持续Goal SHA `c1d71c2d867560859672b5665df200f05a80ac726de25b881e26c798755f0cfc`已将原`REFERENCE_CYCLE: wire.job`、SQL-return wires、actual tooling shape、reference/ownership/local-state、migration physical ledger和21-member manifest闭合到tooling 46/46与actual semantic PASS。但pre-review独立审计证明P10 authenticated-subject HMAC/consent仍缺byte-exact domain/framing/subject/KID-epoch rotation/lookup tuple/legacy-row disposition/golden vectors；至少两个安全合理实现产生不同digest与authorization结果，命中Goal硬阻断。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-continuous-goal-hard-blocked.md`。
- **前一当前真相（v1.5 Job schema registry closure BLOCKED before review）**：有限registry授权SHA `e73d2a683efd44668e6215312aca284d63cdd32dd192f3617784eece898254cb`已完整核验。修改前一次性确认parse/commit/export共3 descriptor+9 schema dangling refs；model/schema已新增`jobDescriptors`与`payloadSchemas`并登记三个现有P08 family，未改payload业务字段。Schema/generator/reproducibility通过，但semantic fixture首次新失败`REFERENCE_CYCLE: wire.job`：generic graph将合法descriptor↔wire↔schema双向关系判为环。测试38项仅18 pass/20 fail，actual semantic与reviews未运行，未形成可认证manifest。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-job-schema-registry-closure-blocked.md`。
- **前一当前真相（v1.5 semantic fixture correction BLOCKED）**：fixture 24/24通过后actual model缺payload schema全局注册。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-semantic-fixture-correction-blocked.md`。
- **前一当前真相（v1.5 wire correction BLOCKED）**：原wire/SQL误绑已修正，但fixture缺`job.test.v1`登记。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-v15-wire-correction-blocked.md`。
- **前一当前真相（v1.5 initial BLOCKED）**：single-machine-source model首次actual semantic失败`WIRE_SQL_RETURN_MISMATCH: wire.p08_parse_payload`。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-authority-package-v15-blocked.md`。
- **前一当前真相（v1.4 BLOCKED）**：v1.4两类review分别发现9/10 Blocker，rejected manifest为`0d46e9e3c0525bae51eae882ad5b90f600cab97cd970cf3f8f2cc96857807a67`。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-authority-package-v14-blocked.md`。
- **前一当前真相（v1.3 BLOCKED）**：v1.3两类独立复核均发现Blocker/High，rejected manifest为`39f5fec58b9b574b9ca411601690be631c557e1dc8773973689b8123c664aa02`。证据：`tasks/checkpoints/integration-2026-08-04-dashboard-f1-authority-package-v13-blocked.md`。
- **前一当前真相（2026-08-03，v1.2 BLOCKED）**：P09/P10 v1.2及P04/P05-P08/P02/Unified ledger/manifest候选经两类独立复核发现Blocker/High，全部为non-authority。证据：`tasks/checkpoints/integration-2026-08-03-dashboard-f1-contract-authority-package-v12-blocked.md`。
- **前一当前真相（F1 initial audit BLOCKED）**：F1复核发现P10低基数suppression泄漏、P08 Import commit/Export create Job payload producer-validator不一致，以及migration68 P10权限矩阵断言错位。详细证据：`tasks/checkpoints/integration-2026-08-03-dashboard-f1-platform-foundation-blocked.md`。
- 本地source migrations为68，production按最新持久证据仍为41且本轮未访问；无migration69、Stage C、生产migration/provider/deploy。Main protected 80-record manifest仍为`ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`，stash仍为`23fc05dc7c8106f11f248f01b5fbafbe38e3477f`。
- P10 final历史证据保留：`tasks/checkpoints/integration-2026-08-03-dashboard-p10-final-audit-completion.md`；F1复核不得改写该历史checkpoint，应以前述新BLOCKED checkpoint作为current truth。
- 下列P07及更早内容为保留的历史累计记录；不得覆盖上述current truth。
- Dashboard P07 已完成；四条标准业务线现统一到 docs-only completion commit `05d968431676ac93618e80ece8fc65ddada9e814`，其测试代码父提交为 canonical Integration HEAD `11d2c83a81e23c45a92b9fed6822d9b3364adca6`。Frontend `1ecc898` / `83a17084` 与 Backend `f079cb2` / `0e9f60b` 已通过正常 Integration merges `3eb1e06`、`014564e`、`497e1fa`、`11d2c83` 集成。当前仅待本轮 case-count docs correction commit；该 commit 后允许另行启动 P08。
- `ed44885` 记录的 authenticated blocker 保留为真实历史：F0 `readOnly` root transport 曾在 `fetch` 前阻断写操作。现在 Frontend 仅对 exact P07 allowlist 开放 operation-aware transport，并修复同 actor/Asset、per-kind capability 与 mutation-response fencing，不削弱全局只读回退或 capability/scope 边界。Backend 安全投影仅含 `retryBinding: { jobId, jobVersion, variants: [{ role, expectedVersion }] }`，`expectedAssetVersion` 取当前 Asset `version`；仅在精确授权、失败状态、retryable class、未耗尽且完整/未过期 DB-time binding 下暴露，敏感 payload/attempt/lease/fencing/storage/checksum/config/actor 数据不外泄。
- 最终门禁通过：API `203/203`；contracts `172/172`；DB `36` + `33` intentional skip；Worker `21` + `1` intentional skip；type/build、Prisma、migration62 PostgreSQL 16 四路径、native Linux；static `398/398`、fr `196`、SEO `392/308/140/300`、其他 artifacts；Chromium `40/40`。UI-controlled fixture focused `8/8`，full `24/24`，`0 fail / 0 not-executed`；focused 8 rows映射full中的7个unique cases（F07/F08同属A12两个子步骤），其余17个，`7+17=24`，不是full之外额外8。它不是 Backend E2E，但由真实 UI 点击并通过fixture观测请求。纠正证据：`tasks/checkpoints/integration-2026-08-03-dashboard-p07-case-count-correction.md`。
- Local Main、Integration、Frontend、Backend 已统一为 `05d968431676ac93618e80ece8fc65ddada9e814`；production 仍为 `3904a440` / 41 migrations，无 deploy。Dashboard 仅在全功能完成后统一部署。完成证据：`tasks/checkpoints/integration-2026-08-03-dashboard-p07-authenticated-completion.md`；case-count纠正：`tasks/checkpoints/integration-2026-08-03-dashboard-p07-case-count-correction.md`。Blocked 历史证据继续保留。本轮纠正 commit 后可另行启动 P08。
- Dashboard F0 Backend foundation and Frontend read-only Shell chains are normally merged into `integration/fullstack` through `f312033ccd095b8b1b565fa445602e7c2c93b662`; complete source, DB/API/Worker, static artifact, Chromium and controlled local full-stack verification passed. Integration evidence commit and Main strict-fast-forward are the remaining local coordination steps.
- F0 preserves the legacy Dashboard, 21 logical pages, 42 EN/fr artifacts and all Domain APIs; the new Simplified Chinese Shell is server-authoritative `internal`, GET-only and immediately reversible with `dashboard.shell.v2=disabled`. F1 and business-module migration remain frozen.
- Latest Integration evidence: `tasks/checkpoints/integration-2026-07-31-dashboard-f0-read-only-shell.md`.
- Previous Auth/Payment evidence: `tasks/checkpoints/integration-2026-07-31-auth-payment-resilience.md`.
- Previous Account/Cart Integration evidence: `tasks/checkpoints/integration-2026-07-31-account-cart-experience.md`.
- Authenticated Header commits `c1bf65feec74cd722b96395a55ce8dae13fb8c55` and `bf8c7ccec423c22966eb39c73088cf411c53dec7` remain integrated through `fee570504b77781b4aa66e456e669464e5d1770f`; evidence: `tasks/checkpoints/integration-2026-07-30-authenticated-header-layout.md`.
- 2026-07-30 production full-stack release is deployed from source `3904a4404ada5b0107a08d5b9c71a3100f22b447` / product baseline `e9bc0a2a17d094e859fee5fa065b318b15d0ad7f`. Active Frontend root is `/www/wwwroot/vanstro.ca/releases/vanstro-3904a440-20260730`; API and Worker run immutable image `sha256:6a67d850086f9abd2adf7ba6ecbe4a6d6badfa361f8abea7d07482b61897204d`.
- Production remains at 41 successful migrations with no migration executed by this release. ERP pending jobs remain 8 and disconnected; payment reconciliation/refund and failed email queues remain 0. Detailed immutable checkpoint: `tasks/checkpoints/production-2026-07-30-fullstack-3904a440.md`.
- 禁止把 `/Users/zhangguannan/Documents/codex/vanstro-unified-online-20260727` 或其他复制目录作为活动开发仓库；它们只可作为历史来源只读核验。
- 当前本地 `main` 仍为旧blocked candidate `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91`；`integration/fullstack` 已正常双亲合并API测试状态隔离至 `5532e210c6cf56c317b83974ea509b053a1c1fb8`，完整全栈门禁通过，Integration evidence commit与Main strict fast-forward待执行。
- 当前领域 tip：`feature/frontend` = `69319575e3317070a90a2aa94cf1c9e5e6d32e3a`；`feature/backend` = `9c08d27e7a39ff7fd1ef8de1125d8cd73d20eea7`，其中实现commit为 `3f1688000825e8e9bf03e143bddbcee2c35425b8`。
- 当前本地 canonical presentation 仍是已验证的4177 source/build组合；本轮只修复Dashboard测试时间点、rate-limit bucket所有权及Cart/Checkout fixture并发隔离。生产仍为 Fullstack9，二者不得混称。
- 四个标准业务worktree映射见 `CLAUDE.md`。只读审查harness额外创建了一个locked agent worktree/branch；因本轮禁止再次branch/worktree清理，未删除或修改它。
- 当前生产前端：`/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`；它由 fullstack8 内容基线加受控 Commerce overlay 组成。
- 本地代码尚未 push；本次只部署静态前端，未部署 Backend、未迁移数据库、未改 DNS/TLS、未执行真实支付。

## Domain handoffs

- Frontend：`tasks/handoff/frontend.md`
- Backend：`tasks/handoff/backend.md`
- Full-stack integration：`tasks/handoff/integration.md`

新会话必须根据当前分支读取对应 handoff。前端和后端进度分别维护；integration handoff 只记录已共同验证的组合，不替代领域进度。

## Latest trusted checkpoints

- Frontend：`tasks/checkpoints/frontend-2026-07-29-api-contract-boundary.md`
- Backend：`tasks/checkpoints/backend-2026-07-30-api-test-state-isolation.md`
- Integration：`tasks/checkpoints/integration-2026-07-30-api-test-state-isolation.md`
- Presentation Recovery：`tasks/checkpoints/frontend-2026-07-29-presentation-reconciliation.md`
- Production Full-stack：`tasks/checkpoints/production-2026-07-30-fullstack-3904a440.md`
- Previous Production Frontend：`tasks/checkpoints/production-2026-07-28-fullstack9-commerce-ui.md`
- 前一生产 Dashboard/password reset 证据位于 AI_OS 项目 checkpoint：`tasks/checkpoints/2026-07-28-dashboard-password-reset.md`。

## Shared boundaries

- 真实 Moneris card authorization/capture/settlement/refund 仍为主动延期；没有新授权不得执行。
- 现有受保护 untracked 历史材料和 `stash@{0}` 不得 clean、reset、批量 add、apply/pop/drop 或覆盖。
- 下方内容是旧版累计交接记录，保留作历史。与本索引、领域 handoff、当前 Git/source 或最新生产证据冲突时，不得使用旧段落覆盖新状态。

---

# Archived cumulative handoff

## 2026-07-28 生产 P0 加固

- 可信代理限流、Moneris provider Refund、Worker heartbeat/stale queue alerts、自动 logical/base/WAL/PITR、异机备份拉取、TLS 1.2/1.3 均已完成并部署。
- 当前 backend image：`sha256:4deaf75d558bb375f1f3aeaf7333c6bbe0562e89cc4eef350eda015afbd3dc04`；40/40 migrations。
- 最终门禁：API 101/101、Worker 9/9、DB 3/3、backend typecheck/build 和生产回归通过。
- 当前唯一未执行的资金验收是授权持卡人的真实 card charge/settlement/refund；用户于 2026-07-28 明确选择“暂不真实扣款”，该项主动延期，没有新的明确授权不得执行。
- 详细证据：AI_OS 项目 checkpoint `tasks/checkpoints/2026-07-28-production-p0-hardening.md`，架构入口 `docs/BACKEND-HANDOFF-CANONICAL-2026-07-28.md`。

> **当前 canonical 接手入口：** `docs/BACKEND-HANDOFF-CANONICAL-2026-07-28.md`
>
> 该文档包含当前后台架构、服务器实际路径、Compose/nginx、生产状态、完整链路、备份/回滚、测试和遗留风险。本文下方保留大量历史阶段记录；若状态冲突，以 canonical handoff、最新生产 checkpoint 和当前源码/服务器只读事实为准。

## 2026-07-28 当前生产摘要

- 活动前端：`/www/wwwroot/vanstro.ca/releases/working-tree-20260727-fullstack5-reviewed-content-payment`。
- 同源 API：`https://vanstro.ca/api/v1`；PostgreSQL/API healthy、Worker running、38/38 migrations。
- 生产 Compose：`/opt/vanstro-production/app/docker-compose.production-server.yml`，project `vanstro-production`；env 为 `/opt/vanstro-production/.env.production`，权限 `600 root:root`。
- 140 active products；active products 下 300 inventory snapshots 全部 `quantityOnHand=10`，reserved=0；`INVENTORY_SOURCE_MODE=manual`。
- SMTP 和 cash/pickup/delivery/账户/CRM/订单链路已做生产 E2E；Moneris production MCO preload/ticket 已验证，但未执行真实 card charge。
- ERP 当前断开；7 个历史 pending ERP jobs 在接入前必须分类，不能直接批量发送。
- 最新备份：`/www/backup/vanstro-production/20260727T202215Z-after-customer-chain-e2e/vanstro-production.dump`，已验证 SHA-256 与 `pg_restore --list`。
- 最高优先遗留：真实 card/settlement/refund、`TRUST_PROXY_HEADERS`/nginx 限流身份、自动备份/PITR、ERP backlog、可重现 clean release。
- 完整证据：`tasks/checkpoints/2026-07-27-production-customer-chain-e2e.md`。

## 2026-07-27 全栈生产发布（历史阶段，已被上述状态取代）

- 完整前端、网站 API、Worker 和独立 PostgreSQL 已部署到生产；活动前端 release 为 `/www/wwwroot/vanstro.ca/releases/working-tree-20260727-fullstack3-mco`，此前 release 均保留可回滚。
- 生产 API 使用同源 `https://vanstro.ca/api/v1`，无需等待 `api.vanstro.ca` DNS；`/health/ready` 为 HTTP 200。生产 Compose 的 PostgreSQL/API 均 healthy、Worker running、38 migrations 完成。
- 生产目录为 140 个 active MB01 products / 300 SKU mappings；Demo 产品已 archived。静态产物 4,609 files，浏览器 36/36、live PDP/cart/checkout/manual address、Secure HttpOnly auth cookie、SMTP 投递均已验证。
- 最终备份：`/www/backup/vanstro-production/20260727T175821Z`；此前恢复演练通过 38 migrations、143 product rows、300 MB01 mappings。
- Moneris modern Primary/Secondary keys 已通过认证层验证，但提供的 Test MID 不符合 modern API 的 13-character `X-Merchant-Id`；当前 MCO v2 仍缺 API Token + Checkout ID。因此 online card 继续 fail-closed，未执行真实支付；POS/cash 可用。
- ERP 按用户范围暂不配置；地址已改为手填。当前库存是每 SKU 100 的受控临时数量，并非 ERP authoritative inventory，后续 ERP 团队接管时必须替换。
- 详细证据：`tasks/checkpoints/2026-07-27-fullstack-production-deployed.md`。

## 2026-07-27 Staging runtime 恢复与验收

- 已检查并恢复服务器 BaoTa Cron `11`（`vanstro-staging-deploy-once-v2`），没有盲目启动重复部署；任务于服务器时间 `2026-07-27 07:40:38` 输出 `STAGING_DEPLOY_COMPLETE`。
- 单一共享镜像 `vanstro-staging-backend:latest` 已构建：`sha256:680a85b8809029cc53f09bc27a5b27263b8569a1405cc7c6b30102a248ffb68d`，大小 `402433190` bytes。
- `vanstro-staging` Compose 状态：PostgreSQL healthy、migrate `Exited (0)`、API healthy、Worker Up；API 仅绑定 `127.0.0.1:4001`，数据库仅绑定 `127.0.0.1:15433`。
- 当前仓库 migration 目录为 38 个；Staging DB 为 `38 applied / 0 failed`，最新为 `20260730260000_production_rbac_bootstrap`，迁移日志确认全部成功。
- `GET http://127.0.0.1:4001/health/ready` 返回 HTTP 200，API 与 database 均为 `ok`。
- Worker 进程存活并轮询，但持续报告 SMTP 未配置，因此邮件链路不可用；真实 ERP 也未获得成功证据。
- nginx 当前没有指向 `127.0.0.1:4001` 的 reverse proxy，也没有 staging API hostname/certificate；公网 `https://vanstro.ca/` 仍为 200，`/health/ready` 为 404，现有静态生产站未被改动。
- Cron 11 仍存在且日程为 23:59，存在意外再次执行风险；删除属于服务器变更，等待明确授权。
- 详细证据：`tasks/checkpoints/2026-07-27-staging-runtime-deployed.md`。生产 cutover、真实支付、DNS/TLS、生产 SMTP/ERP/Canada Post、PITR/restore、监控与回滚仍为 **NO-GO**。

## 2026-07-27 最终上线目标进展

- 用户目标已升级为完整生产上线、ERP 产品预接、完全版 CRM、本地清理备份、线上差异核对和服务器部署。
- 本地代码阶段已完成：ERP 产品四接口预接与 machine sync、支付 confirmation recovery、并发/过期库存保护、真实 Moneris transaction number fail-closed、退款状态保护、Worker fencing、Cookie auth/CSRF、Analytics canonicalization、CRM owner/tags/tasks、DSAR 扩展、37+1（共 38）migrations、production image、migration/preflight runner 和部署 runbook。
- 当前门禁：DB 3/3、API 95/95、Worker 6/6、Contract 5/5、全仓 typecheck、backend/Next/Pages build、38 migration production wrapper、production image API/Worker smoke、本地多进程 Demo E2E 均通过。
- 清理前完整备份：`/Users/zhangguannan/Documents/codex/vanstro-backups/20260727-vanstro-pre-cleanup`；最终 release patch：`/Users/zhangguannan/Documents/codex/vanstro-backups/20260727-final-release`。
- 当前生产真实集成：Moneris blocked、Canada Post blocked、SMTP failed（仅本地 Mailpit 配置）、ERP failed（placeholder）、Production API blocked；`api.vanstro.ca` 无 DNS；服务器未安装 Docker/PostgreSQL/Node 运行环境，且 `.env.production` 不存在。
- 因此真实支付和 production cutover 仍为 **NO-GO**。禁止将本地 Demo E2E 冒充生产验收，禁止在缺生产 Secret/DB/backup/DNS/TLS 时部署 API/Worker。
- 下一步必须由授权方安全提供：Moneris QA/prod、Canada Post、生产 SMTP、真实 ERP endpoint/token、生产 PostgreSQL、Secret Manager/`.env.production`、`api.vanstro.ca` DNS/TLS；然后按 `docs/PRODUCTION-INFRASTRUCTURE-RUNBOOK-2026-07-27.md` 执行真实验收和部署。



> **CP20 / 2026-07-27：** 用户已要求忽略 ERP 部门交付文件，转向项目上线完善。本轮已完成部署/runtime、生产镜像、migration/readiness、Worker 可靠性、cookie/CSRF、隐私、analytics canonicalization、SMTP TLS 与密钥校验修复；记录验证为 Node 22.22.2、typecheck、API 91/91、Worker 6/6、backend/Next production build、隔离库 34/34 migrations、生产镜像 API readiness + Worker `--once` smoke，以及本地 staging E2E。以上仅支持 **Demo acceptance**；真实支付和生产 cutover 明确 **NO-GO**，Moneris 支付发现/恢复、真实交易 ID、退款义务与 provider evidence、checkout recovery/idempotency、Worker lease fencing、税务/财务约束及外部生产门禁仍未解决。未执行生产部署、DNS/TLS 切换、生产 migration、真实支付启用、commit 或 push。保护现有脏工作树：不得 clean/reset/checkout 覆盖、操作 stash 或批量纳入文件。详见 `tasks/checkpoints/2026-07-27-CP20-production-hardening.md`。

> 首次填写：2026-07-26 03:05 CDT
> 恢复更新：2026-07-27（从中断会话 `734266d7-69d0-4d7a-aef7-a6525f3dc3a2` 恢复）
> 仓库：`/Users/zhangguannan/Documents/codex/vanstro`
> 分支：`claude/dealer-neutral-copy-sync-20260721`
> 当前 HEAD：`85363ef`
> Demo RC 检查点：`tasks/checkpoints/2026-07-26-local-release-candidate.md`
> 本文件路径：`tasks/handoff.md`（任务连续性真源）

## 0. 2026-07-27 会话恢复与当前接手状态

### 中断会话恢复结论

会话 `734266d7-69d0-4d7a-aef7-a6525f3dc3a2` 的原始记录位于：

`/Users/zhangguannan/.claude/projects/-Users-zhangguannan-Documents-AI-OS-projects-vanstro/734266d7-69d0-4d7a-aef7-a6525f3dc3a2.jsonl`

该会话已完成后端初始接手核验，并在结束前创建了“并行审计后端各功能域”“核验并归并审计发现”“输出后端审计报告”三个临时任务，但在该会话的 JSONL 结束前尚未真正调用审计 agent。此后，审计、整改与 Demo RC 已在其他续接会话或执行流程中完成，并已持久化到 Git、报告和检查点。因此：

- 指定会话的聊天记录止于审计启动前，但没有证据表明项目工作产物丢失；
- 后续完成证据包括 `docs/reports/backend-full-audit-2026-07-26.md`、`docs/reports/backend-remediation-status-2026-07-26.md`、CP40 与 Demo RC 检查点，以及后续代码提交；
- 不需要因为该会话中断而从零重做全量审计；下一阶段是线上部署和真实供应商/生产环境验收；
- 旧会话当时核验的是 `HEAD 05ece17`，当前源码及完成状态必须以最新提交和检查点为准。

### 当前 Git 与可信验证基线

- 当前分支：`claude/dealer-neutral-copy-sync-20260721`。
- 当前 `HEAD`：`85363ef`（`Align ERP catalog and outbound contract`）。
- 相对远端同名分支：ahead 2、behind 0；未在本恢复会话 push。
- 当前仍有既有 modified/untracked 文件和 `stash@{0}`；不得 clean、reset、checkout、apply/pop/drop stash、覆盖或批量纳入提交。
- `tasks/checkpoints/2026-07-26-local-release-candidate.md` 记录 Demo Release Candidate 已完成：API 87/87、DB 3/3、Worker 4/4、contracts 5/5、backend build、Next dynamic build、Pages static export、fresh PostgreSQL 34/34 migrations + seed + smoke，以及本地多进程 staging E2E 均通过。
- 上述门禁是既有检查点证据，本恢复会话没有重新运行；该检查点之后又有 Demo adapter、真实集成 gate 和 ERP contract 提交，因此不得把检查点自动表述为对 `85363ef` 的完整重跑证明。
- `pnpm qa:real-integrations` 最近记录为 `0 passed / 0 failed / 5 blocked`，原因是未提供真实 vendor 凭据和 `PRODUCTION_API_URL`。Demo 证据不得替代真实 Moneris、Canada Post、SMTP、ERP 或生产环境证据。

### 当前边界与下一步

- 当前阶段是 **Demo RC 完成，线上与真实 vendor 验收待后续阶段**。
- 未获当前会话明确授权前，不得部署、修改 DNS/TLS、执行生产 migration、启用真实支付、启动生产 Worker、push 或提交。
- 全后端审计与代码整改已由后续流程完成，不应因指定会话中断而重复启动；下一阶段应围绕生产部署、真实 Moneris、Canada Post、SMTP、ERP、生产数据库与可观测性完成验收。
- 原文第 1–15 节主要描述 `05ece17` / `3eb35c5` 时点，保留作历史基线；与本节或最新检查点冲突时，以本节、当前代码和最新检查点为准。

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
