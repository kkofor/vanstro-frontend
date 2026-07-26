---
title: VanStro 后端审计整改与上线就绪状态
date: 2026-07-26
baseline_audit: docs/reports/backend-full-audit-2026-07-26.md
status: code-remediated — external production verification pending
---

# VanStro 后端审计整改与上线就绪状态

## 1. 结论

审计报告中的代码内生产阻断问题已完成第一轮系统整改。当前代码状态已经从“NEEDS WORK / 不可进入生产验收”提升为：

> **代码级上线候选（release candidate）；真实外部服务、Node 22 CI、生产基础设施和恢复演练尚待环境验收。**

不能在缺少真实 Moneris、SMTP、ERP、Canada Post 和生产数据库条件下声明“生产已经上线验证通过”。

## 2. 已完成整改

### 身份和权限

- 管理员密码、状态和角色删除受目标权限上限保护；
- 管理员密码最少 12 字符；
- 新增权限层级专项测试。

### 支付和交易安全

- Deployment 模式禁止模拟支付；
- `.env.example` 默认关闭支付模拟；
- Moneris receipt 缺少订单号或金额时 fail closed；
- 支付 provider 确认先持久化为 `PaymentEvent`；
- 订单创建或库存消费失败转为 `reconciliation_required`；
- 新增退款生命周期状态，为后续真实 provider refund 接口提供模型基础。

### 库存一致性

- Session 过期认领与 reservation 释放同事务执行；
- Payment callback 验证 reservation 与 Session items 完整匹配；
- 手动 reservation release 使用 CAS；
- Dashboard/ERP 取消使用状态 CAS，防止重复补库存；
- 新增数据库库存非负约束。

### Checkout

- CRM、PaymentSession 和库存预留纳入同一事务；
- 持久化 `Idempotency-Key` 与请求摘要；
- 前端每次提交生成幂等键；
- 强制加拿大地址、省份枚举和 CAD 单币种；
- Delivery 按收货省份选择税率；
- 自动 dealer 选择后二次验证 active 状态和履约能力。

### ERP 履约

- ERP 签名覆盖 ERP system、状态和 Shipment tracking；
- Shipment 幂等键区分 shipped/delivered；
- 终态订单不可被乱序事件回退；
- 状态更新使用条件 CAS。

### Worker

- 每个 handler 建立独立故障边界；
- 信号处理在首次 tick 前注册；
- 收紧邮件/ERP lease 最小值和最大重试；
- Catalog 调度使用 PostgreSQL advisory lock；
- 区分成功、失败和遗留 running 的重试间隔；
- 新增 Worker 测试门禁。

### API 契约和浏览器边界

- CORS 允许支付、reservation、幂等和 request ID 请求头；
- 移除无版本 API 镜像，仅保留 `/api/v1`；
- 公开订单事件不再透传内部 actor/provider/ERP ID；
- Shipment 投影统一选最新事件；
- OpenAPI 从实际 Hono method+path 生成，验证 153 个路径；
- Guest token 不再由新流程放入 URL；兼容旧 URL 时会立即转存 sessionStorage 并清除地址栏。

### 隐私和秘密

- Analytics 写入必须匹配服务端已记录 Consent；
- Referrer 只保留 origin + pathname；
- 账户、订单、结账和支付等敏感路径拒绝追踪；
- Dashboard SMTP 密码使用 AES-256-GCM 加密后入库；
- Deployment 需要独立 `EMAIL_SETTINGS_ENCRYPTION_KEY`。

### Seed、Smoke、CI 和构建

- 默认 seed 只同步 RBAC 和超级管理员，不覆盖运营数据；
- Demo seed 需要显式授权，deployment 禁止；
- Destructive smoke 需要 test 模式、显式授权和测试库命名；
- Backend CI 修复 runtime mode、管理员凭据和根文件 paths；
- Node 生产基线固定为 22；
- DB/API/Worker/CLI 均生成编译产物；
- 编译后的 API 与 Worker 已使用纯 Node 运行验证；
- GitHub Pages 明确为只读静态 Demo，不隐式连接生产 API。

## 3. 已通过验证

| 门禁 | 结果 |
| --- | --- |
| 全仓 TypeScript | 通过 |
| DB tests | 3/3 通过 |
| API tests | 86/86 通过（含 ERP inventory/customer webhook 与 checkout promotion） |
| Worker tests | 3/3 通过 |
| Package contract tests | 5/5 通过 |
| Backend build | DB/API/Worker/CLI 全部通过 |
| Next dynamic production build | 通过 |
| GitHub Pages static export | 通过，172 个 fr-CA HTML 已校验 |
| OpenAPI route inventory | 159 paths，method/path 校验通过；Checkout/Payment 关键请求契约已声明 |
| 编译 API readiness | `/health/ready` 通过 |
| 编译 Worker `--once` | 正常退出；本地 SMTP 未运行，邮件按预期进入 retry |
| Empty DB migrations | 34/34 应用成功；最终临时库 full smoke 通过 |
| Temporary DB seed + full API smoke | 通过；34 migrations；临时数据库随后删除 |
| Local multi-process staging E2E | 编译 API + Worker + ERP mock + Mailpit + 隔离 PostgreSQL：cart→checkout→payment→order→ERP webhook→email 全链路通过 |
| Failure drills | 重复支付/ERP 重放幂等、API 重启恢复、SMTP retry_wait→sent 全部通过 |
| GitHub backend-ci | 通过：`30222347105`（Node 22、fresh PostgreSQL、34 migrations、seed/build/QA） |
| `git diff --check` | 通过 |

## 4. 尚待外部环境验收

以下项目无法只靠仓库代码完成，仍是生产发布前硬门槛：

1. **Moneris QA E2E**：真实 preload、Hosted Checkout、receipt、服务端 reconciliation、refund。
2. **SMTP**：真实凭据、域名 SPF/DKIM/DMARC、投递、退信、重复发送演练。
3. **ERP**：真实合同、幂等键、乱序/重复 webhook、订单/客户/库存对账。
4. **Canada Post**：真实 AddressComplete key、配额和字段兼容。
5. **Node 22 CI**：本机已使用 Node 22.22.2 跑通全门禁；仍需远端 GitHub CI 对提交状态进行最终确认。
6. **生产数据库**：备份、PITR、restore drill、连接池预算、lock timeout 和在线 migration。
7. **生产基础设施**：DNS/TLS、API/Worker 编排、readiness/liveness、日志、metrics、告警和回滚。
8. **法务/财务确认**：各省税率、Delivery place-of-supply、数据 retention、DSAR 期限和订单保留要求。

## 5. 发布判定

当前允许进入：

- Staging 部署；
- Moneris QA；
- ERP/SMTP/Canada Post 联调；
- 灾备和迁移演练；
- 生产发布审批。

当前仍不应直接执行：

- 真实生产 migrate；
- 真实支付切换；
- DNS/TLS 切流；
- 长驻生产 Worker；
- 线上部署（用户已授权，但于 2026-07-26 最新指令中要求暂缓线上部署）。

代码提交和分支 push 已获授权并执行；线上动作按用户最新指令暂缓，待提供部署目标与真实凭据后继续。
