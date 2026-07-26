---
date: 2026-07-26
checkpoint: CP40
project: VanStro
scope: backend-remediation
status: code-remediated-external-acceptance-pending
repository: /Users/zhangguannan/Documents/codex/vanstro
branch: claude/dealer-neutral-copy-sync-20260721
head: 05ece17
---

# CP40 — VanStro 后端整改持久化检查点

## 检查点结论

后端代码整改范围已完成，并已通过本轮代码级门禁；当前状态仅可表述为**代码级上线候选**。真实外部服务与生产基础设施仍未验收，因此不得表述为“生产已验证”或“可以直接上线”。

## 已完成的代码整改范围

- 身份与权限：管理员目标权限上限、密码强度、状态与角色保护。
- 支付与交易安全：Deployment 禁止模拟支付；Moneris receipt 关键字段 fail closed；provider 确认先持久化；失败订单进入 reconciliation；退款生命周期建模。
- 库存一致性：过期 Session 与 reservation 同事务处理；callback 完整匹配；release/cancel 使用 CAS；库存非负约束。
- Checkout：CRM、PaymentSession、库存预留事务化；幂等键与请求摘要；加拿大地址、省份枚举、CAD 单币种、按省税率；dealer 二次校验。
- ERP 履约：签名覆盖关键字段；Shipment 幂等；终态防回退；条件 CAS 更新。
- Worker：handler 独立故障边界；信号注册；lease/retry 收紧；catalog advisory lock；重试间隔分类。
- API 契约与浏览器边界：CORS 请求头对齐；仅保留 `/api/v1`；公开订单事件脱敏；Shipment 最新事件投影；OpenAPI 路由校验；guest token URL 清理。
- 隐私与秘密：服务端 Consent 门控；referrer 最小化；敏感路径拒绝追踪；SMTP 密码 AES-256-GCM 加密；Deployment 独立加密密钥。
- Seed、Smoke、CI 与构建：默认 seed 不覆盖运营数据；demo/destructive smoke 加硬门槛；Node 生产基线固定；DB/API/Worker/CLI 编译产物；静态 Demo 与生产 API 隔离。

## 已通过门禁

- Node 22：通过。
- API tests：79/79 通过。
- DB tests：2/2 通过。
- Worker tests：3/3 通过。
- Package contract tests：5/5 通过。
- Backend build：通过。
- 27 个 migrations：在临时数据库完整应用并完成 smoke，临时库随后清理。

上述门禁只证明当前代码与临时验证环境的状态，不替代真实外部服务或生产环境验收。

## 尚待真实环境验收

以下仍是发布硬门槛：

1. Moneris：真实 QA/prod preload、Hosted Checkout、receipt、reconciliation、refund。
2. SMTP：真实凭据、收件箱投递、SPF/DKIM/DMARC、退信、重试与重复发送演练。
3. ERP：真实合同、订单/客户/库存同步、幂等、重复与乱序 webhook、对账。
4. Canada Post：真实 AddressComplete key、suggest/retrieve、配额及错误回退。
5. 生产基础设施：生产数据库备份/PITR/restore drill、连接池与在线 migration，及 DNS/TLS、API/Worker 编排、探针、日志、指标、告警、回滚与切流。

## 授权边界

用户最新消息仅为“授权”，但**授权对象、范围和可执行动作尚待主会话明确**。在获得明确、逐项授权前，不得将该词解释为以下任何授权：

- `git push`；
- 生产数据库 migration；
- 真实支付凭据启用或支付切换；
- 部署、DNS/TLS 切流或启动长驻生产 Worker。

主会话必须先确认目标环境、具体动作、凭据边界、回滚条件和验收责任，再执行任何外部或生产操作。

## Git 与工作树保护

- 当前分支：`claude/dealer-neutral-copy-sync-20260721`。
- 当前 HEAD：`05ece17`。
- 最近功能提交：`3eb35c5`。
- 仓库当前存在大量既有脏文件；只读核对时 `git status --porcelain=v1` 共 169 条路径记录（48 个 modified、121 个 untracked）。
- 这些改动包含既有工作、审计材料及其他噪声，归属不可仅凭当前会话判断。
- **禁止清理、reset、checkout、stash、覆盖或误提交这些既有脏文件。**

## 本检查点动作边界

本次仅只读核对 Git 状态、最近提交、整改状态报告、生产发布 checklist 与 handoff，并创建本检查点。未修改业务代码，未提交，未 push，未部署，也未执行任何生产迁移或支付切换。

## 只读依据

- `docs/reports/backend-remediation-status-2026-07-26.md`
- `docs/PRODUCTION-RELEASE-CHECKLIST.md`
- `tasks/handoff.md`
- `git status --short --branch`
- `git log -8`
