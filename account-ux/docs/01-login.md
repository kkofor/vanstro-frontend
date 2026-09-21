# 01 · 用户登录 · 交互说明

原型：`login.html` · 流程图：`flows.html#f1`（总流程）、`#f2`（状态机）、`#f3`（Google / Apple 时序）

## 1. 页面结构

| 区域 | 内容 |
|---|---|
| 左侧品牌区（深色底） | 反白稿 Logo、标语 “YOUR GLOBAL SUPPLY PLATFORM”（青翠绿）、欢迎语、三条价值点（加拿大配送 / PIPEDA / EN·FR）、页脚版权 + Privacy / Terms / Help、低透明辅助图形 |
| 顶栏 | 仅 EN / FR 切换（注册入口移入表单，见下） |
| 表单区 | H1 “Sign in” · 标识符输入 · 密码输入 · 一行辅助链接：左 “New to Vanstro? Create an account”（→ register.html）· 右 “Forgot password?” · Sign in · “or continue with” · Google / Apple · 法务脚注 |

## 2. 字段规则

### 2.1 标识符（Email, mobile or username）

单输入框，前端实时识别并在右侧显示芯片、切换左图标与 `inputmode`：

| 判定 | 规则 | 归一化 | 芯片 |
|---|---|---|---|
| Email | 含 `@`，`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | 转小写 | `Email` |
| Mobile · CA | 仅数字 / 空格 / `()+-.`，去非数字后 10 位（或 11 位以 1 开头），首位 2–9 | `+1XXXXXXXXXX`，展示 `+1 (204) 555-0142` | `Mobile · CA` |
| Username | `^[a-zA-Z0-9_.-]{3,30}$` | 原样 | `Username` |

- `autocomplete="username"`、`autocapitalize="off"`、`spellcheck="false"`。
- 手机识别有效时，帮助文案显示 “Will sign in as +1 (204) 555-0142”。

### 2.2 密码

- `type=password`，右侧眼睛按钮切换明文 / 密文（图标 eye ↔ eye-off，`aria-pressed`）。
- 检测 Caps Lock（`getModifierState`），在标签右侧显示橙色 “Caps Lock is on”。
- 不做前端强度校验（登录态），仅非空。
- 服务端错误后清空密码框并聚焦。

### 2.3 会话时长（无“记住我”勾选框）

- 2026-09 起去掉 “Remember me” 复选框：登录成功统一签发 30 天持久 Cookie（`Secure; HttpOnly; SameSite=Lax`），与主站一致；新设备登录会发送一封“新设备登录”通知邮件，个人中心 “Where you’re signed in” 可随时单独退出某设备。
- 共享电脑场景由 “Sign out of all other devices” 与设备列表覆盖，而不是把选择压给登录时刻。

## 3. 校验与错误

### 3.1 前端校验（提交时）

| 条件 | 文案 |
|---|---|
| 标识符为空 | Enter your email, mobile number or username. |
| Email 格式错误 | That email address doesn’t look right. |
| 手机格式错误 | Enter a 10-digit Canadian mobile number, e.g. (204) 555-0142. |
| 用户名格式错误 | Usernames are 3–30 letters, numbers, dots or underscores. |
| 密码为空 | Enter your password. |

字段级红色描边 + 图标 + 文案；焦点移到第一个错误字段。

### 3.2 服务端结果

| HTTP | 场景 | UI |
|---|---|---|
| 200 | 成功 | 全屏成功态 “Signed in · Welcome back, {name}” + 2.4s 进度条 → 302 跳转；提供 “Continue now” |
| 401 | 凭证错误 | 错误横幅（通用文案，不区分账号不存在 / 密码错误，防枚举）“Incorrect email/mobile or password.” + “Reset your password” 链接；剩余 ≤ 3 次时追加 “N attempts left before a 15-minute lock”；两个输入框描边变红 |
| 423 | 连续 5 次失败 | 警告横幅 + `15:00` 倒计时，禁用 Sign in；推荐重置密码或使用 Google / Apple；倒计时结束自动恢复 |
| 403 | 邮箱未验证 | 警告横幅 “Please verify your email first.” + Resend link / Change email |
| 409 | 该邮箱仅有社交登录 | 信息横幅 “This email is linked to Google sign-in.” + 引导 Continue with Google 或 “set a password”（走忘记密码流程为账号补设密码） |
| 429 | IP / 账号限流 | 同 423 文案，倒计时取服务端 `Retry-After` |
| 401 ×3 | 同一账号 / IP 连续 3 次失败 | 密码框下方出现 **CAPTCHA**（文字图 + 音频替代 + 换一张）；未填 → “Enter the characters shown.”；错误 → “Those characters didn’t match. Try the new image.” 成功登录后清除 |

> 锁定计数按账号 + IP 维度，服务端记录；前端仅展示。密码错误 5 次后即使输入正确密码也需等待或走重置。

## 4. 成功后的跳转

1. 读取 `?redirect=` 参数，**白名单**：`/account* /checkout* /orders* /quotes* /cart`；其他一切（外域、`//`、`javascript:`、未知路径）降级为 `/account` 并静默记录（防 open redirect）。原型 “evil.example” 状态演示降级。
2. 默认跳转 `/account`；来自购物车 / 结算的登录跳回 `/checkout` 并显示 Toast “Signed in — returning you to checkout…”。
3. 成功态停留 2.4s（可点击 “Continue now” 立即跳转），用于展示品牌反馈并等待会话 Cookie 写入。
4. 若已登录用户访问 `/login`，直接 302 到 redirect 或 `/account`。

## 5. Google / Apple 登录

- 按钮：`Google`（白底，官方 G 图标）、`Apple`（黑底白 Logo）。并排放在 “or continue with” 分隔线下。
- 协议：OAuth 2.0 / OIDC 授权码 + PKCE + `state` + `nonce`；弹窗方式，桌面为 popup，移动端为全页跳转。
- 服务端匹配顺序：`provider_user_id` → 已验证邮箱自动合并（提示 “已将 Google 关联到现有账号”）→ 新建账号（无密码）。
- 首次登录弹出 “One last step”：可选手机号（+1）、CASL 营销同意（默认不勾选，注明主体与地址），Skip / Continue 均可进入成功态。
- Apple：仅首次返回姓名 / 邮箱，需立即持久化；支持 Hide My Email 中继地址（`@privaterelay.appleid.com`），邮件发送域需在 Apple 开发者后台注册。
- 用户取消弹窗 → 信息横幅 “Google sign-in was cancelled. No changes were made.”

## 6. 状态表（对应原型 “Force state”）

| 状态 | 触发 | 可见变化 |
|---|---|---|
| Default | 进入页面 | 空表单 |
| Typing | 输入 | 右侧识别芯片、左图标切换 |
| Validation error | 提交 | 字段级错误 |
| Loading | 提交通过 | 按钮 spinner，禁用 |
| Auth failed | 401 | 错误横幅、红描边、清空密码 |
| Locked | 5 次失败 | 警告横幅、倒计时、禁用按钮 |
| Unverified | 403 | 警告横幅 + 重发链接 |
| Social only | 409 | 信息横幅 |
| CAPTCHA | 3 次失败 | 密码框下出现验证码块 |
| Success | 200 | 全屏成功态 → 2.4s 自动跳转（`prefers-reduced-motion` 时 0.8s）；“Continue now” 可提前 |

## 7. 接口契约（建议）

```http
POST /api/auth/login
{ "identifier": "demo@vanstro.ca", "password": "…", "remember": true }

200 { "user": { "id", "displayName" }, "redirect": "/account" }   Set-Cookie: session=…; Max-Age=2592000 (remember)
401 { "error": "invalid_credentials", "attemptsLeft": 3, "captchaRequired": true }
423 { "error": "locked", "retryAfter": 900 }
403 { "error": "email_unverified" }
409 { "error": "social_only", "providers": ["google"] }

POST /api/auth/social   { "provider": "google" | "apple", "code", "state", "codeVerifier" }
200 { "user", "isNew": false }   201 { "user", "isNew": true }
```

## 8. 演示账号（原型）

| 输入 | 结果 |
|---|---|
| `demo@vanstro.ca` / `Vanstro2026!` | 成功 |
| `(204) 555-0142` / `Vanstro2026!` | 手机号成功 |
| `google@vanstro.ca` / 任意 | 仅社交账号 |
| `unverified@vanstro.ca` / `Vanstro2026!` | 邮箱未验证 |
| 其他 | 凭证错误，5 次后锁定 |
