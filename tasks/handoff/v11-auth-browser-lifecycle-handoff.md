# V11 Auth Browser Total Gate — Lifecycle 连续性交接

> 生成时间：2026-08-16 02:01 CDT（07:01 UTC）
> 本轮任务：只撰写交接文档；未改动任何源码/测试/门禁。

## 1. 权威版本绑定

- runId：`20260816T051108Z-8e10921b`
- testedCommit（= HEAD）：`0b90cfa86ad73ab7ee942bff6780044016c19bd7`
- testedTree（= HEAD^{tree}）：`01b35947d2c60ef9a838aab515cea4e43aa95c19`
- 分支：`integration/fullstack`
- 权威 evidence：`tasks/evidence/v11-auth-browser/acceptance-results.json`
- lifecycle evidence：`tasks/evidence/v11-auth-browser/lifecycle-gate-results.json`（schemaVersion `v11-lifecycle-gate-2`，`proven: false`，`winningMethod: null`）

以上绑定已机械核对一致（`git rev-parse HEAD HEAD^{tree}` 与 evidence 字段相等）。

## 2. 34 项矩阵逐项状态

31 pass / 3 not-executed（R2、B08、B10）/ 0 fail。

| 项 | 状态 | 来源 |
|---|---|---|
| C1 | pass | cross-system |
| C2 | pass | cross-system |
| C3 | pass | cross-system |
| C4 | pass | cross-system |
| D1 | pass | cross-system |
| D2 | pass | cross-system |
| D3 | pass | cross-system |
| D4 | pass | cross-system |
| D5 | pass | cross-system |
| O1 | pass | cross-system |
| O2 | pass | cross-system |
| O3 | pass | cross-system |
| O4 | pass | cross-system |
| O5 | pass | cross-system |
| O6 | pass | cross-system |
| R1 | pass | cross-system |
| R2 | **not-executed** | lifecycle |
| R3 | pass | cross-system |
| R4 | pass | cross-system |
| R5 | pass | cross-system |
| S08 | pass | token-resume |
| B01 | pass | token-resume |
| B02 | pass | token-resume |
| B03 | pass | token-resume |
| B04 | pass | token-resume |
| B05 | pass | token-resume |
| B06 | pass | token-resume |
| B07 | pass | token-resume |
| B08 | **not-executed** | lifecycle |
| B09 | pass | token-resume |
| B10 | **not-executed** | lifecycle |
| B11 | pass | token-resume |
| B12 | pass | token-resume |
| B13 | pass | token-resume |

整体门禁：`phaseComplete=true`、`overallComplete=false`、`completed=false`、`exitCode=1`。

harnessExitCodes：`crossSystem=1`、`tokenResume=1`、`lifecycle=0`、`build=0`（crossSystem/tokenResume 因 R2/B08/B10 为 not-executed 而报 phase fail，不是其自有 case 失败）。

### 2.1 R2 / B08 / B10 唯一原因

三者的 `observations.reason` 完全一致：

```text
no real hidden→visible lifecycle method proven
```

自动矩阵 M1–M4 均未产生真实 hidden→visible：

- M1-headed-default → `hiddenVisible: false`
- M2-headed-no-background-flags → `hiddenVisible: false`
- M3-cdp-minimize → `hiddenVisible: false`
- M4-system-events → `hiddenVisible: false`

因此 `proven=false`、`winningMethod=null`，三 case 诚实保持 `not-executed`，不得宣称 pass。

## 3. 已完成清单

- S08 token 4-state machine（`data-token-state`：readyNonEmpty / loading / readyEmpty / error），含 revoke。
- B01 locale（en-CA `Unnamed token` / fr-CA `Jeton sans nom`，移除不可达 zh 分支）。
- 匿名 volume 泄漏修复：`5aea6e35`、`e439d817`、`0b90cfa8`；`run-v11-token-resume.sh` 与 `run-v11-auth.sh` 现使用 `docker run --rm` + 无条件 `docker rm -f -v`，EXIT/INT/TERM 全路径清理；total runner 转发信号且无递归 wait 死锁。volume delta 回归已验证 6 条路径全 `volumeDelta=0`。
- 11 个 attestation checkpoints（固定序列，全 ok，末点 `merge/after`）。
- 完整生产 build：`buildExitCode=0`、`buildId=true`、`outIndex=true`、`outFrench=true`。
- 总门禁四阶段 + merge：crossSystem、tokenResume、lifecycle、build、merge 全部执行且各自 attestation 通过。
- exact_chain 精确 Foundation→Authorization 链（canonical URL + GET + 200 + request/response 顺序 + D0）、全量 ignored-input attestation、固定 11-point 序列、reentrant signal 修复均已提交。

## 4. 唯一剩余阻断

需要**真人在 headed Chromium 执行真实 OS hidden→visible**，由 `v11-lifecycle-gate.py` 的 manual 模式观察真实 trace 后闭合。

预计共 5 次操作：

1. M5 feasibility（手动可行性，产生 winningMethod=manual 与同一 browser/context）
2. B10 fresh resume
3. B08 state preservation
4. R2 first-resume
5. R2 second-resume

运行方式：

```text
V11_LIFECYCLE_MODE=manual
V11_LIFECYCLE_MANUAL_TIMEOUT=600（或更充足）
```

ACK 文件只代表 readiness，不能代替事件证据；每一步必须等到 trace 中先 hidden 后 visible。

闭合后必须验证：

- R2 exact Foundation→Authorization 链；
- R2 第二次无重复请求；
- B08 状态保留（name/ttl 输入值不变）；
- B10 fresh resume；
- 两次 R2 DOM 无 full-page loading。

## 5. 关键脚本路径

- 总门禁 runner：`qa/v11-auth-browser/run-v11-total-gate.py`
- disposable PG16 + API + Next dev runner：`qa/v11-auth-browser/run-v11-token-resume.sh`（`V11_ACCEPTANCE_SCRIPT` 选择阶段）
- lifecycle gate：`qa/v11-auth-browser/v11-lifecycle-gate.py`（`V11_LIFECYCLE_MODE=manual`）
- 跨系统验收：`qa/v11-auth-browser/v11-cross-system-acceptance.py`
- Token/resume 验收：`qa/v11-auth-browser/v11-token-resume-acceptance.py`
- build gate：`qa/v11-auth-browser/v11-build-gate.py`
- 合并：`qa/v11-auth-browser/merge-acceptance.py`
- workspace attestation：`qa/v11-auth-browser/v11-workspace-attest.py` + `qa/v11-auth-browser/attestation-policy.json`
- 匿名卷回归：`qa/v11-auth-browser/test-v11-volume-cleanup.sh`

## 6. 安全边界（原样保留）

- 不删除数据库、商品、SKU、价格、媒体、订单、客户、库存或 ERP 数据。
- 不执行真实支付、退款或 ERP 联调。
- 不泄露 `.env`、Token、Cookie、密码、连接串或真实 PII。
- 不提交 `docs/erp-api-reference.md`、无关 evidence、缓存和其他受保护 untracked。
- 不连接或修改生产数据库、不操作生产 Token、不部署、不推进 main。
- 不 reset / rebase / amend / force push。
- 保护用户已有工作。
- 本轮交接任务不修改源码/测试/门禁。

## 7. 继任者完整 resume prompt

```text
你是 VanStro 现有 Storefront、现有 Dashboard 与当前生产系统的 OMP 总协调执行师。
真实源码根：/Users/zhangguannan/Documents/codex/vanstro
当前 worktree：/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/integration
分支：integration/fullstack

当前权威 evidence（tasks/evidence/v11-auth-browser/acceptance-results.json）绑定：
runId 20260816T051108Z-8e10921b、
HEAD 0b90cfa86ad73ab7ee942bff6780044016c19bd7、
TREE 01b35947d2c60ef9a838aab515cea4e43aa95c19。
34 项矩阵 31 pass / 3 not-executed（R2、B08、B10），0 fail，overallComplete=false，exitCode=1。

唯一剩余阻断：R2/B08/B10 需要在 headed Chromium 中由真人执行真实 OS hidden→visible，
由 v11-lifecycle-gate.py 的 manual 模式观察到真实 trace 后闭合。
自动化 M1-M4 均未产生真实 hidden→visible，因此这三项保持 not-executed，严禁宣称 pass。

请执行：
1. 机械核对 git status / HEAD / TREE 与 acceptance-results.json 绑定一致；
   匿名 volume 泄漏修复已提交（0b90cfa8 及父提交 5aea6e35、e439d817），不要再次改动该部分。
2. 从干净 evidence 目录运行 V11 total gate，设置 V11_LIFECYCLE_MODE=manual 并给足
   V11_LIFECYCLE_MANUAL_TIMEOUT（例如 600）。
3. 使用当前已实现的同一 browser/context 与精确 targetId/windowId/browserPid 绑定；
   不修改源码，不生成合成 visibilitychange，不 shadow document.visibilityState，
   不手工 dispatch lifecycle 事件。
4. 明确逐步提示操作者完成真实 OS hidden→visible，共 5 次：
   M5 feasibility、B10 fresh resume、B08 state preservation、R2 first-resume、R2 second-resume。
   ACK 仅代表 readiness，不能代替事件证据。
5. 每一步必须等到真实 trace 先 hidden 后 visible；未观察到则保持 not-executed。
6. 成功后验证：R2 exact Foundation→Authorization 链、第二次无重复请求、B08 状态保留、
   B10 fresh resume、两次 R2 DOM 无 full-page loading。
7. 让独立只读 Reviewer 复核最终 HEAD/TREE/runId、34 项矩阵、11 个 attestation checkpoints、
   build gate、lifecycle target identity 与 trace；主协调再自审并报告。
8. 不部署、不推进 main、不触碰生产/ERP/受保护 untracked、不删除任何数据、
   不 reset/rebase/amend/force push。
```
