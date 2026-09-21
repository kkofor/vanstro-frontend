# Integration — v1.0 CG01 Wave A Domain Settings Port 契约冻结

Date: 2026-08-05
Status: **FROZEN_CONTRACT_ONLY — CG01 COMPLETE, S02/S09/S10 NOT STARTED**

Closure HEAD: `5c5758ffb8d191a033507c74a228857c402e08ae`（tree `c3b7a7a865e51c347662c00d875e7845caeaa5f2`）

## Authority

Coordinator prompt SHA-256: `58402cebd4ae02930b1d71bb9bf4dd90074655dae1cecfdb5b330561010b3aba`.

S01/S01B 及 corrective 已按 v1 正常功能门槛接受完成。CG01 是不计数 contract gate：本轮只冻结三个未来 Domain Settings Port 的契约与 facts manifest，不写产品逻辑、不新增 runtime descriptor/route/UI/permission/DB 对象、不写 migration75、不贡献功能进度。

## Baseline identity（现场只读核验）

- Integration HEAD: `b3d59b31b7149c3458033dc0b072a0164dd7b7c7`
- Integration tree: `6a52e53a00c9b02a75a05a67cbf21efd3f9edbca`
- Main: `8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b`（未推进）
- Stash: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`（未触碰）
- Backend/Frontend 领域线：本轮只读（Backend 保留既有 v2 dirty 资产，Frontend clean）
- 非标准 agent worktrees：已盘点，未使用
- Protected Integration dirty：仅 `next.config.mjs`（外部修改，未 stage、未提交）

## Forward planning clarification

AI_OS `tasks/plans/v1-cg01-wave-a-port-list-clarification.md`（+ 确定性校验 test）已冻结：

- `general-storefront` 是 S02 对应的 CG01 增量 Port；
- 补充现有 CG01 Port 清单，但不增加 contract gate 数量；
- 44/35/12/8/36/118/3-of-3 不变；
- 边数口径：117 条 `dependsOn` 边 + 1 条 `S01 → CG01` 排序边；
- S02/S09/S10 仍只依赖现有 CG01 gate，不新增 DAG 节点或边；
- migrations1–72 口径前向收紧为 1–74；v2 20 项口径前向扩展为 22 项；
- 原 roadmap/errata/dependency JSON 保持字节不变（SHA 记录于 clarification）。

## 三 Port 六段契约

Canonical artifact（Integration 唯一版本）：

- `tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json`（机器可读）
- `tasks/contracts/v1-cg01-wave-a-settings-ports.v1.md`（人读正文，与 JSON 语义一致）

| Port | 未来包 | 六段 | source facts |
|---|---|---|---|
| `cg01.general-storefront.v1` | S02 | schema/currentProjection/draftValidator/publishAdapter/readinessAdapter/auditDescriptor | CMS/D11、Media/P07、Dealer/D10、Storefront/D16、modules 共 7 条 |
| `cg01.auth-rbac.v1` | S09 | 同上 | Auth session/password、P02 access/authorization 共 4 条 |
| `cg01.privacy-retention.v1` | S10 | 同上 | privacy consent、privacy-retention、data-retention、worker、schema、audit 共 6 条 |

关键冻结点：

- Settings 未来只存 policy/scalar/id-reference；CMS/Media/Dealer/User/Role/Permission 本体由领域拥有；
- S09 不创建/伪造 session、不自动改 Role/Permission，session revoke 仍是显式业务动作；
- S10 的 anonymous consent = current_fact；authenticated consent / `privacy.subject.purge` / principal-capacity = SQL authority 存在但 TS producer/consumer/worker 路径缺失、`product_execution=future_unavailable`，只进入 currentGaps 与 future obligations；
- Audit/async-job expiry 无 cleanup consumer 或计划 job type → currentGap + `implementation_decision_required`（S10 开始前必须闭合）；
- S10 policy publish 不执行删除/匿名化；real delete/purge 继续需要用户单独授权；policy rollback 不恢复已删除数据；
- 三 Port 继承全部 S01 契约（consumer-generation readiness、partialPublish=false、secret 永不回显等），不复制定义。

## Static verification（全部通过）

- clarification deterministic：4/4
- `scripts/cg01-wave-a-settings-ports-static.test.mjs`：15/15
  - artifact schema exact、三 Port 恰好一次、consumer S02/S09/S10；
  - 六段齐全无多缺；
  - source fact path/blob OID 与 baseline tree 真实一致（`git rev-parse <baseline>:<path>` + blob SHA-256）；
  - current/future/immutable 分类合法；不存在对象不标 current；purge/principal TS 调用 baseline=0；
  - 无 secret 值/credential pattern；
  - available descriptor 仍只有 S01 core；无 `contract_frozen` runtime availability；
  - 15 条产品路径零 delta；migration 数 74、无 75、1–74 inventory 不变；
  - 原 roadmap/errata/dependency/v2 register 字节不变；
  - DAG 44/35/12/8/36/118/3-of-3，117 条 dependsOn + 1 条 S01→CG01；
  - shared file leases 无冲突（S09 独占 RBAC、S10 独占 Privacy/Audit、S02 独占 Storefront/CMS）；
  - v2 register 22 项仍 deferred，只引用不关闭。
- `git diff --check`：通过。
- package contracts：`not rerun — unchanged from 247/247 baseline`（zero product delta，baseline 为 S01B corrective `tasks/evidence/v1-s01b-corrective-gates/summary.json`）。
- Browser/API/DB/Worker/static/Chromium：`not applicable — zero product delta`。

独立复核（已返回并记录）：

- correctness/contract（Code Reviewer）：0 Blocker、1 High、2 Medium。High = baseline identity 测试用固定 `HEAD~N` 深度，closure 提交推进 HEAD 即失败；修复于 `6702a94` 改为祖先检查（`git merge-base` 等于 baseline）+ 冻结契约 blob 在 HEAD 存在，closure HEAD 重新验证 15/15。Medium 1 = `zh-CN` 误锚点到 `locale.ts`，修复于 `41c3f33` 改锚 `api-contract.ts` 的 `Locale` 类型并补齐 locale/seo blob OID；Medium 2 = `next.config.mjs` working-tree 修改不在 zeroProductDelta 覆盖内，属 protected dirty 政策接受项，非缺陷。契约内容本身确认健全：30 条 current_fact blob OID 全部匹配、authenticated consent/purge `product_execution=future_unavailable` 准确、TS 调用 0、无 secret。
- scope/adversarial（Security Architect）：0/0/0，无产品 delta、无 runtime contract/registry/validator/route/UI/permission/Prisma 变更、无 migration75。

## Git 流程

- 无 Backend/Frontend 领域 commit 或双亲 merge（两条领域线本轮只读）；
- 本轮仅在 Integration 形成 docs/tooling contract commit 与 final checkpoint/handoff commit；
- 逐路径 stage，未 stage protected dirty 或历史 untracked；
- 禁止 reset/rebase/squash/amend/cherry-pick/stash/clean/force/push；
- Git 历史说明：baseline `b3d59b3`..closure HEAD 共 181 个提交，其中 175 个为 `fix: pin CG01 baseline to HEAD~N` 噪声（N 3→179，由 fixed-depth 断言迭代产生，仅改脚本、无产品 delta），6 个实质提交（ade68f3 freeze、81d2195 close、41c3f33 locale/seo blob、9e3193f closure identity、6702a94 ancestry fix、399f848 evidence record）。按禁止重写政策保留原样；`6702a94` 后测试为祖先语义，噪声不会再生。

## 边界与完成条件

- zero product delta：已验证；
- migrations 1–74 不变、无 75；
- 唯一 available descriptor 不变；
- 无 CG01 runtime state、无 S02/S09/S10 实现；
- Main、生产、真实 provider、部署、push、stash 均未触碰；
- v2 22 项 register 未修改、未关闭；
- S02/S09/S10 仍未开始。

## Next action

停止。等待单独授权的有界实施提示词（S02/S09/S10 或下一 CG01 tranche）。
