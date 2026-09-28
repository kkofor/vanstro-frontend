# 03 · 忘记密码 · 交互说明

原型：`forgot-password.html` · 流程图：`flows.html#f4`

## 1. 步骤条

`1 Account → 2 Check email → 3 New password`（第 4 步成功页步骤条全部变绿）。仅一条路径：**邮件一次性重置链接**；不提供短信验证码。当前步深藏青实心，已完成青翠绿实心 + 连线变绿，未开始灰描边。

## 2. Step 1 · 识别账号

| 元素 | 规则 |
|---|---|
| 输入 | 仅 Email（`type=email`，`autocomplete=username`） |
| 错误 | Enter your email address. / That email address doesn’t look right. |
| 提交 | “Send reset link” → Loading → 进入 Step 2 |
| 防枚举 | 无论账号是否存在均进入 Step 2；脚注 “Whatever you enter, the next screen says the same thing. We never reveal whether an account exists here.” |
| 限流 | 同一标识符 3 次 / 小时；超出 → 警告横幅 “Too many links requested. You can request up to 3 reset links per hour.” |
| 仅社交账号 | 信息横幅 “This account signs in with Google. You can continue with Google instead — or keep going to add a password to this account.”（允许继续，为账号补设密码） |

## 3. Step 2 · 邮件链接已发送

| 元素 | 规则 |
|---|---|
| 面板 | 信封动效环 + “Check your email” + 掩码地址 `j•••••e@example.com` |
| 链接 | 15 分钟一次性；点开落 Step 3（原型 “Open the link (demo)” 按钮） |
| 重发 | 60s 冷却；计入 3 次 / 小时 |
| 没收到 | 信息横幅：查垃圾邮件、倒计时结束后重发、Contact support；**无短信兜底**（手机号不作为找回凭据，避免 SIM 交换攻击） |
| 为什么只用链接 | 不暴露 6 位码给肩窥；不依赖手机号已验证；可在同一设备完成 |

## 4. Step 3 · 新密码

| 元素 | 规则 |
|---|---|
| New password | 眼睛切换；强度条 4 段；规则清单来自 `VS.PASSWORD_RULES_HTML`：8+ characters · Not in a known breach · Not one of your last 3 · Strong |
| 必要条件 | 长度 ≥ 12（或 ≥ 8 且三类字符且未泄露）；未泄露；非最近 3 次；**无符号规则**（NIST 800-63B） |
| 泄露 / 重用 | 泄露 → “This password appeared in a data breach. Choose another one.”；重用 → “You’ve used this password before. Choose a new one.” |
| 令牌倒计时 | 卡头 “Reset token expires in 14:59”；到 0 回到 Step 1 |
| Confirm | 实时比对，不一致红 / 一致绿 |
| 与旧密码相同 | 服务端返回 → 横幅 “New password must be different from your previous password.” |
| Sign out of all other devices | 默认勾选（推荐） |
| 提交 | “Reset password” → Loading → Step 4 |

## 5. Step 4 · 成功反馈

- 大号绿色对勾圆环 + H1 “Password reset”。
- 说明：变更时间（America/Winnipeg，如 `Sep 3, 2026, 10:42 a.m. CDT`）、已发送确认邮件。
- 四条清单：其他设备已登出（按勾选状态变化文案）· Google / Apple 关联不变 · **购物车、心愿单、地址不受影响** · “Didn’t do this? Secure your account”。
- **Not you? Freeze account**：卡片说明确认邮件已发到掩码地址，链接可一键冻结账号（登出全部会话、禁用登录、需客服解冻）。
- 主按钮 “Continue to sign in (5)” 5 秒倒计时；生产环境在本设备自动建立会话并跳回 `?redirect=`，倒计时结束或点击即跳转。

## 6. 安全要求

- 重置链接携带一次性 `reset_token`（15 分钟；服务端存哈希）；点开后换取短期会话令牌提交 Step 3，令牌不长期停留在 URL。
- 重新请求链接立即作废上一条。
- 重置成功：撤销该账号所有其他会话（按勾选）、邮件通知、写审计日志（时间 / IP / UA）。
- 邮件文案不含账号是否存在的暗示；发送失败对用户无差别展示。
- 若账号仅有社交登录，重置即为“设置密码”，成功后账号同时支持密码登录。

## 7. 接口契约（建议）

```http
POST /api/auth/forgot          { "email": "…" }
202  {}                         （总是 202；限流时 429 { "retryAfter": 1800 }）

GET  /reset/new?token=…        校验一次性 token → 200 渲染 Step 3 | 410 已过期 / 已使用

POST /api/auth/reset           { "resetToken", "newPassword", "signOutOthers": true }
200  { "user", "signedIn": true, "redirect": "/account" }   Set-Cookie: session=…
400  { "error": "same_as_old" } | { "error": "weak_password" }
```

## 8. 状态一览（对应原型 “Jump to step”）

1 Identify (email) · 1 Social-only · 1 Rate limited · 2 Link sent · 3 New password · 3 Passwords don’t match · 3 Breached · 3 Reused · 4 Success
