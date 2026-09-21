# VanStro 生产基础设施 Runbook

## 当前事实

- `vanstro.ca` 当前是宝塔 nginx 静态站，root 指向 immutable release。
- 服务器为 Ubuntu 22.04，16 CPU、约 16 GB RAM、约 88 GB 可用磁盘。
- 服务器尚未安装宝塔 Docker、PostgreSQL 或 Node.js 管理器。
- `api.vanstro.ca` 当前无 A/AAAA 记录。
- 仓库没有 `.env.production`，真实 Moneris、Canada Post、SMTP、ERP 和生产数据库配置尚未提供。
- 因此当前禁止启动生产 API/Worker、执行生产 migration 或开启真实卡支付。

## 目标拓扑

```text
vanstro.ca / www.vanstro.ca
  -> nginx static release

api.vanstro.ca
  -> nginx TLS reverse proxy
  -> 127.0.0.1:4000
  -> VanStro API container

VanStro Worker container
  -> Production PostgreSQL 16
  -> Moneris / Canada Post / SMTP / ERP
```

生产 PostgreSQL 应优先采用独立托管实例或独立数据库主机，具备自动备份、PITR 和可验证 restore。不要将唯一数据库与静态网站、API 和 Worker 放在同一故障域。

## 阶段 1：供应商与 Secret

必须通过 Secret Manager 或服务器权限为 600 的 `.env.production` 注入，禁止发到聊天或 Git：

- `DATABASE_URL`
- `PAYMENT_CALLBACK_SECRET`
- `EMAIL_SETTINGS_ENCRYPTION_KEY`
- `MONERIS_*`
- `CANADA_POST_API_KEY`
- `ERP_*`
- `SMTP_*`
- `SUPER_ADMIN_*`
- scoped `VANSTRO_SERVICE_ACCOUNT_TOKEN`

以 `.env.production.example` 为字段模板。完成后运行：

```bash
pnpm preflight:production
pnpm qa:real-integrations
```

真实集成必须全部 passed；blocked 或 failed 均为 NO-GO。

## 阶段 2：数据库

1. 创建 PostgreSQL 16 staging。
2. 安装 `pg_trgm`。
3. 对空库运行 `pnpm migrate:production`，确认 37/37。
4. Seed 仅同步 RBAC 和超级管理员；禁止 demo seed。
5. 导入生产等价快照到隔离库。
6. 运行 `pnpm preflight:existing-database`。
7. 清理任何冲突后才运行 migration。
8. 完成 backup、PITR、restore drill，记录 backup ID、RPO、RTO。

## 阶段 3：API 与 Worker staging

1. 安装 Docker Engine/Compose，或使用外部容器平台。
2. 构建并固定 image digest。
3. API 仅绑定 loopback/私网。
4. Worker 不暴露公网端口。
5. 配置 `/health/live` 与 `/health/ready`。
6. 验证 SIGTERM、restart policy、日志与 queue alerts。
7. 执行 `qa:local-staging`、供应商 QA、支付关页恢复、退款、重复交易和 Worker fencing 演练。

## 阶段 4：DNS/TLS 与 nginx

1. 创建 `api.vanstro.ca` A/AAAA。
2. 签发 TLS 证书。
3. nginx 只代理 `/` 到 `127.0.0.1:4000`。
4. 覆盖 `X-Forwarded-*`，禁止客户端伪造代理来源。
5. API 防火墙禁止公网直连 4000。
6. CORS 仅允许 `https://vanstro.ca` 与 `https://www.vanstro.ca`。
7. TLS 最低版本为 TLS 1.2；现有静态站 nginx 仍允许 TLS 1.1，需要单独收紧。

## 阶段 5：前端切换

1. 使用经过全部门禁的 Git commit 构建。
2. 设置：

```text
NEXT_PUBLIC_API_BASE_URL=https://api.vanstro.ca/api/v1
NEXT_PUBLIC_DEMO_READ_ONLY=false
NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION=false
```

3. 宝塔发布必须创建新 release，不覆盖当前 release。
4. 切换 root 后逐文件 SHA-256 校验。
5. 失败立即切回上一 release。

## 阶段 6：生产 canary

- 注册、登录、退出。
- 购物车与 cash/POS 最小订单。
- Dashboard 非卡 mark-paid。
- Canada Post 地址查询。
- Moneris 最小批准金额 canary。
- Provider transaction number、订单和内部 PaymentEvent 三方一致。
- ERP order/customer/inventory 只生成一次。
- SMTP 邮件只投递一次或安全重试。
- 退款、重复交易和 reconciliation 队列检查。

## 回滚

- 前端：宝塔站点 root 切回前一 immutable release。
- API/Worker：切回前一 image digest。
- Schema：优先 forward-fix，不修改 Prisma migration history。
- 数据库 restore 仅在 incident command 下执行，并先确认数据损失窗口。
- 重新开放 checkout 前必须对账 Moneris settlement、退款和 pending confirmation。

## Go/No-Go

只有以下全部满足才允许生产切流：

- 全量 CI 和 production image 通过；
- 37 migrations 与生产快照 preflight 通过；
- Moneris、Canada Post、SMTP、ERP、Production API 五项真实集成全部 passed；
- backup/PITR/restore drill 通过；
- DNS/TLS、监控、告警与回滚演练通过；
- 最终源码已形成可复现 Git commit；
- 财务、税务、隐私与供应商 QA 已批准。
