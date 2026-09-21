# AGENTS.md

稳定事实，项目级。本文件不记录任务进度、凭据、模型或成本。

## 项目根

- 本文件所在目录是 Git root（worktree）。
- 命令默认以项目根为 cwd。

## 工具链

- Node 22（`.node-version` = 22；`package.json` engines `>=22 <23`）。
- pnpm 11.13.0（`packageManager` 字段与本地 CLI 一致）。

## 数据库迁移

- 迁移目录：`packages/db/prisma/migrations`（时间戳前缀目录）。
- 迁移入口：`pnpm --filter @vanstro/db`；schema 在 `packages/db/prisma/schema.prisma`。

## 最窄验证顺序

- 先运行与改动直接相关的 focused test 或对应 `scripts/test-*-pg16.sh`，再按风险扩大范围；不做全量无谓回归。

## 本地与生产边界

- 验证优先使用本地 disposable PG16 + 真实 `prisma migrate deploy`。
- 禁止对生产/远程数据库执行迁移、写入或 WAL 相关操作；禁止把本地验证连到生产。

## 用户工作保护

- Git 操作前检查工作树与相关 diff；未提交改动属于用户，不得覆盖、回退或绕过。
