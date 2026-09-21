# 07 · 注册 · 交互说明

原型：`register.html` · 流程图：`flows.html#f14` · 错误码：`06-error-codes.md §1a`

## 1. 入口与页面结构

| 入口 | 行为 |
|---|---|
| 顶栏 “Create an account” / 登录页链接 | 进入 `register.html` |
| Guest 结算完成页 “Save my details” | `register.html?from=checkout&order=VS-…`：预填邮箱、姓名、地址；仅需设密码 |
| Google / Apple 首次登录 | 不进入本页；由 `login.html` 的 “One last step” 面板补齐 |

布局与登录页一致：左品牌区（深色）+ 右表单区（最大 420px）。品牌区三条价值点改为注册语境：一分钟完成 · 只发订单邮件除非你同意 · PIPEDA / Law 25。

## 2. 表单字段

| 字段 | 规则 | 备注 |
|---|---|---|
| Google / Apple | 放在邮箱表单**之上**，两颗按钮并列（Google 白底描边 / Apple 黑底，与登录页一致），下接 “or continue with” 分隔线 | Apple 走 Hide My Email 说明面板 |

**一屏约束**：注册页所有状态（默认 / FR / 校验 / 已注册 / Apple / 访客转正 / 验证邮箱 / 完成）在 1366×768 下不出现滚动条。≤800px 视口高度时隐藏底部 PIPEDA 说明与 consent 发件人脚注（内容仍可在隐私政策中查到）；“邮箱已注册” 态隐藏社交按钮和灰掉的 Create account，把 Sign in instead 升为主按钮。
| 标题区 | H1 “Create your account”，下一行 “Already have an account? Sign in”（顶栏不再重复） | 版式参照 2026-09 参考稿 |
| 输入框 | 无前缀图标；密码框右侧显隐按钮；强度条 4 段紧贴输入框，规则以一行提示承载（不再展开清单） | |
| 同意组 | 灰底面板；Terms 行下方等宽红色 `required`；营销行尾橙色描边 `CASL express` 芯片；面板脚注写发送方名称与地址（CASL 身份要求） | |
| 提交按钮 | 通栏；Terms 未勾选时呈浅色 muted 态（仍可点击，点击后聚焦到缺项），勾选后转品牌藏青 | 不用 disabled，避免无反馈 |
| First / Last name | 必填，`autocomplete=given-name / family-name`，`autocapitalize=words` | 中性占位（First name / Last name；FR：Prénom / Nom） |
| Email | 格式校验，转小写 | 已注册 → 409 状态（见 §4） |
| Password | 见 §3 | `autocomplete=new-password` |
| Terms 勾选 | **必填**；未勾选提交 → 字段级错误 “Please accept the Terms to continue.” | 不能预勾选 |
| Marketing 勾选 | 可选，**默认不勾选**（CASL 明示同意）；文案含发送主体与邮寄地址、随时退订 | 与 `02-account.md §7b` 同一条记录 |
| 脚注 | “Order confirmations, receipts and security emails are always sent. They’re transactional, not marketing.” | 帮用户理解为什么不勾营销也会收邮件 |

## 3. 密码策略（全站统一，`assets/vi.js` + `shadcn/lib/password-policy.ts`）

依据 NIST SP 800-63B §5.1.1 与 CCCS ITSAP.30.030：**长度优于组合**。前后端同一套接受条件（弱密码表只维护在 `assets/vi.js` 的 `BREACHED`，服务端解析该数组，不另写一份）。

接受（二者取一）：

- `len ≥ 12`（不再额外要求三类字符；16 位纯小写口令可通过）
- 或 `8 ≤ len < 12` 且四类字符（小写 / 大写 / 数字 / 符号）中至少三类、且不在 `BREACHED` 词表内（完全相等，或长度 ≤ 12 且包含该词）

最短 8，最长 128。存量 `passwordHash` 不强制重置。

| 规则 | 判定 | UI |
|---|---|---|
| Length | 见上；`< 8` 拒绝 | 规则清单 ✓ |
| Not in a known breach | 前后端同一 `BREACHED` 词表（完全相等，或长度 ≤ 12 且包含该词）。注册/重置不再额外打 HIBP，以免 16 位纯小写或 8 位三类口令被前端放行、服务端 422。 | 泄露 → 强度条 1 段红 + “This password appeared in a data breach.” |
| Not one of your last 3 | 仅在修改 / 重置时有历史，注册时恒为 ✓ | |
| Strong | `≥ 16`；或 `≥ 12` 且（≥ 3 个词 或 三类字符） | 4 段绿 |

注册失败时 `register.html` 渲染服务端 `issues`（含 `issues.password` 明细），不只展示 `body.error`。

强度条 4 段：1 红（泄露 / 重用 / <8）· 2 橙 · 3 黄绿 · 4 绿。提示文案由 `VS.passwordHint()` 统一给出，见 `06-error-codes.md PWD_*`。

## 4. 状态（对应原型 “Prototype · states”）

| 状态 | 触发 | 可见变化 |
|---|---|---|
| Default | 进入 | 空表单，Google / Apple 在上 |
| FR | 顶栏 FR | 全部文案切法语；长句（CASL 主体、法务脚注）多 25–35%，宽度不变、允许换行；规则清单也翻译 |
| Email exists | 409 | Email 字段错误 “An account with this email already exists.”；主按钮下方出现 “Sign in instead” / “Reset password”。**只在用户主动提交后**告知（不在 blur 时查重，防枚举） |
| Verify inbox | 201 | 独立面板：信封图标 + 掩码邮箱 + “Resend in 60s” + “Wrong address? Edit”；提示查看垃圾邮件 |
| Verified · welcome | 点邮件链接 | 绿色对勾 + “Welcome, {first}” + 欢迎优惠卡（仅当勾选营销时展示优惠码，否则展示“Start shopping”）+ 2.4s 自动跳转（同登录） |
| Apple · Hide My Email | 选择 Apple 且返回 relay 地址 | 说明面板：relay 地址将接收订单更新；若在 Apple 设置中关闭转发需补备用邮箱；密码字段隐藏（社交账号无密码），校验跳过密码 |
| Guest → account | `?from=checkout` | 顶部订单卡（订单号、金额、地址）；姓名邮箱预填只读；仅需密码 + Terms；标题 “Save your details for next time” |

## 5. 邮箱验证

- 注册成功返回 201，账号状态 `pending_verification`；可浏览、可加购，**不能**保存卡与提交报价，结算时再次提示验证。
- 链接 24 小时有效，一次性；点击后落 `register.html?state=done`（原型）/ `/welcome`（生产）。
- 未验证账号 7 天后自动清理（含所收集的营销同意记录），避免僵尸数据（PIPEDA 保留最小化）。
- 登录未验证账号 → `01-login.md` 403 分支。

## 6. 同意记录（CASL / Law 25）

每次提交写入一条 `consent_events`：

```json
{ "subject": "marketing_email", "state": "express", "channel": "web",
  "source": "register", "termsVersion": "2026-06", "lang": "en-CA",
  "ip": "198.51.100.24", "ua": "…", "at": "2026-09-03T19:41:02Z",
  "text": "Email me Vanstro offers … Unsubscribe any time." }
```

Terms 接受同样写一条 `subject: "terms"`。文案原文随记录保存（CASL 举证要求：证明用户看到了什么）。

## 7. 接口契约（建议）

```http
POST /api/auth/register
{ "firstName", "lastName", "email", "password", "acceptTerms": true,
  "marketingEmail": false, "lang": "en-CA", "from": "checkout"?, "orderNo"? }

201 { "user": { "id", "displayName" }, "status": "pending_verification" }
409 { "error": "email_exists" }                       # REG_409
422 { "error": "password_breached" }                  # PWD_003
422 { "error": "terms_required" }                     # REG_001
429 { "error": "rate_limited", "retryAfter": 3600 }   # 同 IP 10 次 / 小时

POST /api/auth/verify-email   { "token" }  → 200 { "redirect": "/account" } | 410 expired
POST /api/auth/verify-email/resend  → 202（60s 冷却，3 次 / 小时）
```

## 8. 无障碍与本地化

- 每个勾选框是 `<label>` 包裹 `<input type=checkbox>`，视觉方框由 CSS 绘制，键盘空格可切换。
- 错误摘要在字段级；提交失败时焦点移到第一个错误字段。
- FR 文案见 `register.html` 内 `i18n` 对象；Terms / Privacy 链接指向对应语言页面（Law 96：面向魁北克用户的合同条款必须有法语版）。
