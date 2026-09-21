# Integration — v1 S02 General/Brand/Storefront/Localization complete

Date: 2026-08-05
Status: **COMPLETE AND LOCALLY VERIFIED — S09/S10 NOT STARTED**

## Authority

- Coordinator prompt SHA-256: `71cab6414dcc245b2559120816da4536656fa71388ddbd1a51b5cc2d10fbabae`
- UI forward addendum SHA-256: `afe3d49c23fe27fa2aefc352dd4b719a414ad0161d7f7d480e1173f73d76db27`（shadcn-admin 视觉契约，收到时 S02 处于 Backend 实施阶段；按分支 1 在 Frontend 设计前应用）

## Identity

- Contract freeze: `cd7e3cd`（tasks/checkpoints/integration-2026-08-05-v1-s02-contract-frozen.md）
- Backend domain: `b9dc385`（feat），merge `2024dfc`
- Frontend domain: `1cd3b85`（feat），merge `1bb3255`
- Fixes: `46763a2`（PG16 串行）、`0dd5339`（demo fallback）、`8d9e8d2`+`d36f39f`（投影形状）、`1a440fc`（validator 空值）、`1467214`+`d1d437b`（migration75 注释）、`1bc2757`+merge（M1/M2 review 修复）
- Browser evidence: `b3d25c6` → rebind `a9cd4e8` → final（testedCommit `1a440fc`）

## Descriptor

- `settings.general-storefront`（单一 key，无别名；schema `settings.general-storefront.v1`；group general；object；global；mutable；secret false）
- GeneralStorefrontSettingsValueV1 五组字段：generalIdentity/brand/storefront/localization/defaultDealerLocation
- Parity exit：siteDisplayName/announcementRule 真实消费（SiteHeader）；baseColors/fontFamily/maintenanceBannerRule 从 editable 移除（无 consumer）；Media/CMS refs 只读占位（draft 提交 null）

## Migration75

- `packages/db/prisma/migrations/20260805120000_s02_general_storefront/migration.sql`（SHA-256 `07c7fba0d1ae69f77cd3e1a20587f995c0e1a26fb34be81ae2a7e07bb5fee707`）
- S01 `_v2` 函数逐字保留（无 CREATE OR REPLACE s01_*）；独立 `s02_*` 受控函数族 + 独立 lock domain；ledger operation CHECK 前向扩展；S01 shape branch 完整保留（review M1 修复）
- migrations 1–74 SHA 不变（73 `f49524722ace`、74 `f453ff7d953e` 与 S01B 基线一致）；无 migration76
- dealer/location 配对 DB 层 blocker（review M2 修复）
- Read-only SELECT grants 于引用表（review H1 注释如实）

## 门禁（全部通过）

| Gate | Result |
|---|---|
| monorepo typecheck | 0 errors |
| package contracts | 247/247（S01B 基线持平） |
| S02 frontend focused | 23/23 |
| S01B+S02 PG16（真实 PG16 fixture） | 27/27（S01B 13 + S02 14） |
| DB | 50/0/36 skip |
| Worker | 31/0/1 skip |
| migration75 static | 5/5 |
| static export | 414/414 + 204 fr HTML；general-storefront EN/fr 产物 |
| Chromium current-tree | 40/40（VANSTRO_QA_EXTERNAL_API_ORIGINS 含 vanstro.ca 允许既有 auth/cart/favorites） |
| SEO/security | passed |
| diff check + secret scan | clean |

## Browser evidence

- Harness: `qa/v1-s02-settings-browser/`（s02-fixture.py + s02-acceptance.py + s02-definition.json + run-s02.sh）
- 真实 Google Chrome/Playwright 1440×1000；**23/23 pass**，0 unexpected console，0 unexpected requests；exit 0（两次确定性）
- testedCommit `1a440fc`、tree `5c0a41b3...`；evidence SHA-256 `3a8370a133edeaac14c8722387731c4ce76d20672b347b8e093b033f20269e1c`
- 覆盖：login/page/registry/read-only/业务 invalid draft/blocker/PATCH/validate/safe diff/publish/Storefront 显示 published name+announcement/EN-fr fallback/ref 解析/missing-ref degraded/stale version/illegal state/malformed UUID/append-only history/rollback generation 3/compiled_default generation 0/static-export hydration+API-down fallback/Audit safe snapshot/logout
- Fixture 模拟后端契约（真实 PG16 由 S02 PG16 14/14 独立覆盖）

## 独立复核

- Correctness（Code Reviewer）：0B/0H/2M/2L — M1（S01 shape branch 弱化）已修复 `1bc2757`；M2（dealer/location 配对仅 API）已修复 `1bc2757`；L1（handoff 未更新）本 checkpoint 处理；L2（S02 PG16 证据未记录）本 checkpoint 记录
- Scope/adversarial（Security Architect）：0B/1H/1M/2L — H1（migration75 注释不实）已修复 `1467214`；M1（fixture vs 真 PG16）由独立 PG16 覆盖；L1/L2（untracked/protected dirty）符合预期

## Storefront 真实消费

- `GET /storefront/config?locale=` 公开只读投影（public-safe + publishedGeneration）
- StorefrontProvider 客户端加载 + generation 握手（精确匹配才 ready，握手不阻止 safe config）
- SiteHeader 消费 siteDisplayName（brand-text + logo alt）与 announcementRule（announcement bar）
- demo 模式（NEXT_PUBLIC_DEMO_READ_ONLY=true）跳过 config 请求保持 compiled fallback；真实部署 hydration 显示 published 值；API down 保持 fallback（S02-21 验证）

## Dirty 保护

- protected `next.config.mjs` / `next-env.d.ts`（Next dev 工件）未 stage/提交
- `tmp-old-gate-test.mjs` untracked 保留未动
- Backend 既有 v2 dirty 资产未触碰；Main/stash/worktrees 未动

## Next action

停止。S09/S10 未开始；等待单独授权。Main 推进需独立授权（review 建议在 handoff 证据齐备后评估）。
