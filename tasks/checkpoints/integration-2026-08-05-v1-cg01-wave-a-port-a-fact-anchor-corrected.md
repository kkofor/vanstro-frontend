# Integration — v1.0 CG01 Wave A Port A Storefront 事实锚点前向纠正

Date: 2026-08-05
Status: **FROZEN_CONTRACT_ONLY — PORT A FACT ANCHOR CORRECTED, S02/S09/S10 NOT STARTED**

## Authority

Correction prompt SHA-256: `af726868993c298fed4670735aac14debb7fa6246ee06ef9555ecaf44a6f9588`.
Prior CG01 Wave A freeze prompt SHA-256: `58402cebd4ae02930b1d71bb9bf4dd90074655dae1cecfdb5b330561010b3aba`.

## 裁决与唯一纠正

独立契约复审判定 CG01 completion 为 `0 Blocker / 1 High / 0 Medium`。唯一 High：Port A `cg01.general-storefront.v1` 把 storefront config current projection 错误锚定到 `apps/api/src/dashboard/foundation.ts`。

- baseline `foundation.ts` 实际拥有 Dashboard Foundation/Shell module/route/permission projection 与 shell config（`DASHBOARD_FOUNDATION_MODULES`、`dashboardShellConfig`、`DASHBOARD_SHELL_FLAG_KEY` = `dashboard.shell.v2`、`projectDashboardModules`、`createDashboardFoundationRoutes`），不含 `storefront_config` 或 `/dashboard/storefront/config`；
- baseline `modules.ts` 拥有真实 `storefront_config` moduleKey 与 `/dashboard/storefront/config` read/write adapter（Pattern B over SiteContentModule），以及 `/dashboard/modules/readiness` module readiness 路由。

## 修正后的身份

- Baseline（不变）：`b3d59b31b7149c3458033dc0b072a0164dd7b7c7` / tree `6a52e53a00c9b02a75a05a67cbf21efd3f9edbca`
- Contract correction commit：`f16584db0159558efe3f85834786458a7d5f7a48`（tree `870cee8c014382c1bb8dceadf44992025832d8ef`）
- Evidence commit：`24ef59a9a412c36404f8345005bb8af390751c00`
- Closure HEAD（本轮实际验证点，gate 16/16 在此运行）：`1d10091543d54db9a198d0afdb7eaebd7a4beeef` / tree `69166acb86312c7e7001698b912291b69fd98fb2`。其后仅 review 记录一致性修复 commit `869ef20`（docs-only：closure HEAD 标识统一、zero-delta 路径清单补 modules.ts、review 结果记录），不改变契约/facts/测试语义；`git merge-base b3d59b3 HEAD = b3d59b3` 祖先关系对任何后续 HEAD 恒成立。

## 正确 fact（baseline tree 导出）

| 事实 | path | symbol/anchor | blobOid | blob SHA-256 | classification | owner |
|---|---|---|---|---|---|---|
| Dashboard Shell/Foundation | `apps/api/src/dashboard/foundation.ts` | `DASHBOARD_FOUNDATION_MODULES` / `dashboardShellConfig` / `DASHBOARD_SHELL_FLAG_KEY` / `projectDashboardModules` | `c2695bdd9945c92a8b89d715851b43e4995ba2f5` | `3a98080fc8ad5909548db1e91aefd34d588de799bc8cb3c95150d649525b3cc6` | current_fact | Dashboard Shell/Foundation |
| storefront config current projection | `apps/api/src/dashboard/modules.ts` | `storefront_config` moduleKey + `/dashboard/storefront/config` read/write adapter（Pattern B raw JSON；S02 parity pending） | `2d3003ab75f3e1c10e8a31e5e76ca70016ef72d1` | `32b270ad8e394138cd5cda54e884ee775bd9f109be62bbf92bf871f7700e2496` | current_fact | Storefront Runtime Config/D16 |
| module readiness | `apps/api/src/dashboard/modules.ts` | `/dashboard/modules/readiness` + `MODULE_KEY_MAP` | `2d3003ab75f3e1c10e8a31e5e76ca70016ef72d1` | 同 modules.ts blob | current_fact | Dashboard modules readiness |

caveat（保持）：当前 storefront config source 仍是 `SiteContentModule` raw JSON（Pattern B）；S02 parity 与 Settings 强生命周期接线未实现。

## 计数重算口径

按修正后实际 artifact 逐 Port 统计（不是沿用旧 review 的 “30 条 current_fact blob OID” 统计）：

- Port A：currentProjection facts 7→**8**；sourceFactsManifest 4→**5**
- Port B：5 / 4（不变）
- Port C：6 / 6（不变）
- 全契约：currentProjection **18→19**；sourceFactsManifest **14→15**

## 同步资产

1. canonical JSON `tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json`（foundation 事实改名 + modules storefront fact 新增 + manifest 同步 + `notStorefrontConfigSource` 标注）
2. canonical Markdown `tasks/contracts/v1-cg01-wave-a-settings-ports.v1.md`（2.2 currentProjection 表同步）
3. static test `scripts/cg01-wave-a-settings-ports-static.test.mjs`（新增 Port A storefront fact anchor 测试：modules.ts 锚定、foundation 非 storefront、baseline semantic anchors、negative mutation）
4. evidence `tasks/evidence/v1-cg01-wave-a-settings-ports/summary.json`
5. 本 checkpoint + AI_OS mirror + 两处 handoff

## 静态回归（全部通过）

- clarification deterministic：4/4
- CG01 static：**16/16**（closure HEAD 验证）
- Port A negative mutation：临时把 storefront fact 改回 foundation.ts → 15/16（预期失败）；还原 → 16/16（已验证）
- `git diff --check`：通过
- secret scan（JSON/MD/test）：无 secret
- zero product delta：16 条产品路径 baseline→HEAD blob OID 一致；migrations 74、无 75
- 唯一 available descriptor 不变

## 现场核验

- Integration HEAD 是 `22c6bc9...` 前向后代、baseline 仍是祖先
- Backend v2 dirty（1 modified + 6 untracked）、Frontend clean、Main `8e2ad74`/tree `3b2bd85...`、stash `23fc05d...`（pre-github-sync-20260708-141840）均未变化
- Protected dirty：仅 `next.config.mjs`（未 stage、未提交）
- **额外 untracked `tmp-old-gate-test.mjs`**：13435 bytes、mtime 2026-08-05 12:50:02 -0500、owner zhangguannan、SHA-256 `2c76e848...`；内容为 static gate 的固定 `HEAD~3` 断言变体（未在任何 commit 中）。按提示词要求未删除、未 stage、未覆盖；无法证明是本 CG01 测试遗留，保留并记录于 evidence summary 的 `untrackedSite`

## 边界

- 未修改产品代码（foundation.ts/modules.ts 等）、未实现 S02/S09/S10
- 未新增 descriptor/route/UI/permission/Prisma 对象
- migrations 1–74 不变、无 migration75
- 未修复 175 个 noise commits 或中间 gate 记录（留 v2/process 治理）
- 未处理 v2 Browser evidence hygiene 项
- Main、生产、provider、deploy、push、stash 未触碰
- 未再次使用 `HEAD~N` 固定深度；baseline identity 用 `merge-base --is-ancestor` + blob 归属 + object 存在性

## Next action

停止。等待单独授权的有界实施提示词（S02/S09/S10 或下一 CG01 tranche）。
