# 02 · 个人中心 · 交互说明

原型：`account.html` · 流程图：`flows.html#f5`（信息架构）、`#f6`（资料 / 头像）、`#f7`（修改密码）、`#f8`（变更邮箱 / 手机 · 关联账号）、`#f12`（通讯偏好 · CASL）、`#f13`（数据权利 · 导出 / 删除）

## 1. 信息架构

```
/account
├─ Overview                    概览：开放订单 / 报价 / 项目清单 · Recent orders + Default address（并排等高）· 资料完善度 + 待办
├─ Orders                      订单与报价
├─ ACCOUNT
│  ├─ Profile                  头像 · 基本信息（含首选语言）· 联系与登录详情
│  ├─ Communication preferences 营销同意（Email / SMS / Push · 频率）· 交易类清单 · Consent status
│  ├─ Addresses                地址簿：添加 / 编辑 / 删除 · 默认收货 / 默认账单
│  └─ Payment methods          已保存银行卡：添加 / 编辑 / 删除 · 默认支付方式
├─ SECURITY
│  ├─ Password                 修改密码 · 关联账号 · 两步验证（`#password`；旧链接 `#security` 自动映射）
│  ├─ Devices                  已登录设备 · Sign out of all
│  └─ Privacy and your data    数据类别 · 导出 · 删除账号
└─ Sign out
```

- 站点顶栏：标准英文标识（深藏青）· 一级导航 · 搜索 · EN / FR · 购物车 · 头像。
- 左侧栏卡片：头像 + 昵称 + “Member since 2025 · Winnipeg, MB”；导航不带图标，分 **ACCOUNT / SECURITY** 两组（11px 大写灰色小标）；导航项 hover 灰底，选中 navy-50 底 + 左侧 3px 深藏青竖条 + 深藏青文字；Sign out 用错误红。
- 概览页不再单独放 Language 卡片（语言在 Profile 基本信息中修改）。
- 面包屑：Home › My account › {当前页}。
- URL 以 hash 记录当前分区（`#profile`），从结算跳转进入（`?from=checkout`）时显示 Toast。

## 1a. Overview · 概览

| 区块 | 内容 |
|---|---|
| 标题行 | “Good morning, {nickname}” + 右侧 **会员等级芯片**（`chip--orange`，菱形图标 + “Gold member · 1,840 points”）：这是暖阳橙作为标签底色的唯一位置，文字用橙墨 |
| 三格统计 | Open orders / Saved quotes / Project lists，各带一行上下文 |
| Recent orders | 最近 3 单：订单号（等宽）· 日期 · 收货城市 · 状态芯片 · 金额（tabular）；“All orders” 跳 Orders |
| Default address | 默认收货地址 + **税率提示** “Taxes at checkout: GST 5% + RST 7%”（按省份查 `assets/tax.js`） |
| Language | 当前语言 + 用途说明；Change 跳 Profile；Profile 保存后同步 |
| Finish setting up | 完成度条（60%）+ 待办：头像 / 验证手机 / 邮箱已验证；头像上传后变 80% |

## 1b. Orders & quotes · 订单与报价

| 元素 | 规则 |
|---|---|
| 标题副文 | “12 orders since March 2024 · amounts in CAD, taxes included.”；右侧 “Download invoices”（ZIP，CRA 6 年） |
| 筛选 | 胶囊：All / In transit / Delivered / Returns & refunds；纯前端按 `data-s` 过滤 |
| 表格列 | Order（等宽，`nowrap`）· Placed · Ship to（≤ 960px 隐藏）· Status 芯片 · Total（右对齐 tabular）· 行动作 |
| 状态芯片 | In transit `chip--navy` · Delivered `chip--green` · Returned 中性 · Refund pending `chip--orange`（等待类） |
| 行动作 | 在途 → Track；已送达 → Buy again；退货 → Details |
| 金额本地化 | EN `$184.20`；FR `184,20 $ CA`，一律 `Intl.NumberFormat('fr-CA', {style:'currency', currency:'CAD'})` |
| Quotes | 同表结构：报价号 · 项目 · 有效期 · 状态（Awaiting approval 橙 / Expired 中性）· 金额 · Review & approve / Request again；卡头芯片 “1 awaiting your approval” |

## 2. Profile · 头像

| 步骤 | 规则 / 文案 |
|---|---|
| 入口 | 头像右下相机按钮 · “Upload photo” 按钮 · 拖放区（dragover 时变青翠绿虚线） |
| 接受类型 | `image/jpeg` `image/png` `image/webp`；否则 “Unsupported file. Use a JPG, PNG or WebP image.” |
| 大小 | ≤ 5 MB；否则 “That file is 7.8 MB — the limit is 5 MB.” |
| 尺寸 | ≥ 200 × 200 px；否则 “Image is W × H px — please use at least 200 × 200 px.” |
| 裁剪弹窗 | 300px 圆形取景框；拖动定位；滚轮 / 滑块缩放 1–3×（最小缩放使图片覆盖取景框）；Cancel / Save photo |
| 输出 | Canvas 导出 512 × 512 JPEG（q 0.9）→ `POST /api/me/avatar`；全站头像（顶栏、侧栏、大头像）即时更新 |
| 成功 | 提示 “Photo updated”（绿）+ Toast；出现 “Remove” 按钮；完善度 60% → 80% |
| 移除 | 恢复首字母头像（取 First + Last 首字母，深藏青底白字） |

- 上传成功后头像下方出现 `In review` 橙芯片，提示 “Photo updated · in review, usually under a minute”；审核通过变绿 “Photo approved”（原型 6s 模拟）。Law 25 自动化决策：说明处提供人工复核入口。
- 说明文案补充存储方式：“saved as 512 × 512 WebP, original not kept”。

## 3. Profile · 基本信息

| 字段 | 控件 | 规则 | 错误文案 |
|---|---|---|---|
| Display name（昵称） | 文本，maxlength 20 | 2–20 字符，字母 / 数字 / 空格 / `._'-`，Unicode 友好；保存后 EN / FR 自动审核 | Use 2–20 letters, numbers or spaces. |
| Preferred language | 下拉 | English (Canada) / Français (Canada)；用于邮件、收据、站点 | — |
| First / Last name | 文本 | 必填（配送与发票） | Required for shipping and invoices. |
| Gender | 下拉，可选 | Prefer not to say（默认）/ Woman / Man / Non-binary / Prefer to self-describe；帮助文案说明加拿大身份证件支持 X 标记，故不只给两项 | — |
| Date of birth | `type=date`，可选 | ≥ 16 岁；≤ 120 岁；**每年只能改一次**（帮助文案显示下次可改日期）；用途仅生日优惠；提供 “Remove it” | You must be at least 16 years old. / Please check the year. |
| Province / territory | 下拉 | 13 个省 / 地区；用于税费与运费预估 | — |

交互：
- **默认为只读视图**：卡片以“标签 / 值”展示当前资料（空值显示 Not specified / Not added），右上角 **Edit** 按钮；卡头显示 Last updated 时间。
- 点击 Edit 进入编辑模式：字段变为输入框，焦点落到 Display name，卡底出现 **Cancel / Save changes**；Edit 按钮隐藏。
- 编辑模式下任意字段与初始值不同 → 底部浮出深色 **Unsaved changes** 保存条（Discard / Save changes）；全部还原后自动隐藏。
- 输入即时校验（`input` 事件）；Save 时若存在错误：Toast “Please fix the highlighted fields” 并聚焦首个错误。
- 保存成功：`PATCH /api/me` → Toast “Profile saved”，侧栏与问候语昵称同步刷新，初始值重置，回到只读视图并更新 Last updated。
- Cancel / Discard：恢复初始值，回到只读视图。

## 4. Profile · 联系与登录详情

| 项 | 展示 | 操作 |
|---|---|---|
| Email | `demo@vanstro.ca` + `Verified` 绿芯片 + 说明 “Marketing consent doesn’t carry over; we’ll ask again” | Change → 弹窗：新邮箱 + 当前密码 → 向新邮箱发 OTP → 验证后更新并邮件通知旧邮箱；营销同意不随邮箱迁移（CASL 同意绑定地址） |
| Mobile | `+1 (204) 555-0142` + `Not verified` 橙芯片 | Verify → 发送 OTP；Change → 同上（新号码 + 密码 → OTP） |
| Marketing emails | 开关（CASL 明示同意） | 切换即保存并记录时间戳；说明文案 “Offers, new products and project tips (CASL consent)” |

弹窗校验：邮箱格式 / 加拿大 10 位手机；密码为空 → Toast “Enter your password to continue”。

## 5. Sign-in & security · 修改密码

| 字段 | 规则 |
|---|---|
| Current password | 必填；下方常驻 “Forgot your password?” 链接（跳转忘记密码流程） |
| New password | **8+ 位 · 未泄露 · 非最近 3 次 · Strong**（NIST 800-63B，无符号规则，见 `07-register.md §3`）；强度条 4 段；规则清单来自 `VS.PASSWORD_RULES_HTML`；泄露 / 重用即时字段级报错 |
| Confirm new password | 实时比对：不一致红 “Passwords don’t match.”；一致绿 “Passwords match” |
| Sign out of all other devices | 默认勾选 |

结果：
- 当前密码错误 → 字段错误 “That password is incorrect.” + 横幅（含 “reset it by email” 链接）。
- 新旧相同 → 横幅 “New password must be different from your current password.”
- 成功 → 绿色横幅 “Password updated. We sent a confirmation to demo@vanstro.ca. All other devices were signed out.”，清空表单，设备列表移除其他会话，Toast “Password changed”。
- 无密码的社交账号：此卡片标题改为 “Set a password”，隐藏 Current password 字段（需先通过邮箱 OTP 验证）。
- 卡内两块说明：**What happens next**（本设备保持登录、其他设备登出、发送安全邮件且不受营销偏好影响）与 **Why no symbol rule**（长度优于组合，引用 NIST / CCCS）。
- 卡头 “Last changed {n} days ago”。原型演示：`Password1!` 泄露、`Winnipeg-2025` 在最近 3 次。

## 6. Sign-in & security · 关联账号

- Google / Apple 两行：图标 · 名称 · 状态（Connected · 邮箱 / Not connected）· Connect / Disconnect。
- Connect → OAuth 弹窗授权 → Connected。
- Disconnect 前置条件：账号仍有密码 **或** 另一提供方；否则 Toast（错误）“Set a password or connect another provider before disconnecting Google.”
- Apple 已连接时显示 “Hide My Email relay”。

## 7. 两步验证 / 设备 / 删除账号

- 两步验证开关：需已验证手机；未验证时开关回弹并 Toast 提示，跳转 Profile。
- Where you’re signed in：当前设备（绿点 “Active now” + `This device` 芯片 + IP）与其他会话（浏览器 · 系统 · 城市 · IP（非当前设备后两段脱敏）· 时间 · `Trusted · 30 days` 芯片）；单个 “Sign out” 或 “Sign out all other devices”。底部两块说明：**Unfamiliar session?**（先登出再改密码）与 **Location accuracy**（IP 定位可能偏差一个省，移动网络尤甚）。
- Delete account（危险区，红描边卡片）：说明订单 / 发票按 CRA 要求保留 6 年、同意记录按 CASL 举证要求保留；弹窗需输入 `DELETE` 才可发送 24 小时确认邮件；14 天冷静期内重新登录可撤销。

## 7a. Sign-in & security · Privacy & your data（PIPEDA · Law 25）

位置在两步验证 / 设备卡之后、Delete account 之前：先「看得见、拿得走」，再「删」。卡头右侧 `PIPEDA · Law 25` 深藏青芯片。

| 区块 | 内容 | 设计理由 |
|---|---|---|
| We hold | 五格清单：Account details（姓名 / 邮箱 / 手机 / 语言）· Orders & quotes（订单 / 发票 / 退货）· Addresses & cards（地址、卡 token，**无卡号**）· Consent records（CASL 要求保留）· Activity（登录、设备、清单） | PIPEDA 查阅权要求用户能知道持有哪些类别；Law 25 要求告知保存目的与期限 |
| Export a copy | 文案 + `Request my data` 次级按钮（download 图标） | Law 25 §27 可携权：结构化、常用格式 → JSON + CSV；30 天法定上限，文案同时承诺「通常当日」 |
| 点击后 | 按钮禁用 → `✓ Requested`，提示改为「Check j•••••e@example.com…」；Toast | 幂等：24 小时内重复请求返回 429，前端只保持 Requested 态，不报错 |
| Automated decisions | secure-note：说明地址校验 / 风控为自动化，可 `Request a review` 人工复核；隐私官邮箱 `privacy@vanstro.ca` | Law 25 §12.1 自动化决策告知与复核权；隐私官联系方式必须可见 |

- 导出邮件的下载链接 7 天有效，打开需重新登录（防转发泄露）。
- 删除与导出可并行：用户常先导出再删除，删除弹窗里放「先导出一份？」链接。
- 法文：页面语言为 FR 时全部文案切换，隐私官仍为同一邮箱。

## 7b. Communications · 通讯偏好（CASL）

替代原「Notifications」占位。原则：**营销要问，交易不问；每个渠道各自同意；随时可撤，不要 Save 按钮。**

### 卡 1 · Marketing · you choose

| 行 | 控件 | 状态文案 | 规则 |
|---|---|---|---|
| Offers and new arrivals · email | Switch | `Consent given · 12 Mar 2026 · express` / `Withdrawn · {时间} · stops within 10 business days` | 切换即写 `POST /api/consents`；关闭后 Consent status 卡芯片同步变 Withdrawn |
| Sale alerts · text message | Switch | `Express · +1 204 ••• 8821 · reply STOP / ARRÊT` | 手机未验证时开关回弹，行内红字 `Verify your mobile number first` + 链到 Profile；SMS 需短码 + 双语退订 |
| Push | Switch | `On · this browser` | 走 `PATCH /api/me/notifications`，不属于 CASL 商业电子讯息但同样默认关 |
| How often | 分段：Weekly digest / Only big sales / Every new drop | Toast `Saved · weekly digest` | 仅作用于邮件渠道；「减少频率」放在退订之前，是 CASL 之外的留存手段 |

卡脚：说明「此处立即生效，全系统 10 个工作日内」（CASL 撤回上限），以及每次同意 / 撤回记录字段：channel · method · time · source page · terms version。

### 卡 2 · Always on · transactional

列出不可关闭的消息：订单确认 / 发货 / 送达、回执与税票、报价回复、密码 / 登录 / 安全告警、法律与政策变更。文案强调「这些不是营销，CASL 允许不经同意发送」，避免用户以为关了营销就收不到订单邮件。

### 卡 3 · Consent status

| 字段 | 值 |
|---|---|
| Email marketing | `Express` 绿芯片 / `Withdrawn` 灰芯片；时间、来源页（`/account#profile`）、条款版本 |
| Implied consent | 来自购买的默示同意：最近一单日期 + 到期日（2 年）；文案「Express consent above replaces this」 |
| 记录用途 | 说明用于 CASL 举证，删除账号时仍保留 |

### 原型状态

- `Marketing email withdrawn`：Email 开关关、状态灰、Consent status 显示 Withdrawn。
- `SMS on without verified mobile`：演示回弹 + 行内错误。


## 8. Addresses · 地址簿

原型状态：`account.html?demo=addrAdd|addrEdit|addrErr|addrEmpty#addresses`，`?modal=removeAddress`。

**列表**

- 两列卡片；默认收货地址卡片深藏青描边，芯片 `Default shipping`（navy）/ `Default billing`（green）。
- 卡片内容按 Canada Post 展示格式：姓名（加粗）· 公司 · 街道, 单元 · 城市 省份代码 邮编 · Canada · +1 电话；配送说明单独灰底行（卡车图标）。
- 操作：Edit · Remove · Set default shipping / Set default billing（右侧竖排链接按钮，已是默认则不显示）。
- 空状态卡片 + “Add your first address”；上限 10 条，达到后 “Add address” 禁用；底部说明“进行中的订单仍使用删除前的地址”。

**添加 / 编辑弹窗（同一表单）**

| 字段 | 规则 / 文案 |
|---|---|
| Address label | 可选 ≤ 24 字符（Home / Office / Job site…） |
| Country | 固定 Canada（🍁 禁用输入）· “We currently ship within Canada only” |
| Full name | 必填 “Enter the recipient’s full name.” |
| Company | 可选，出现在发票 |
| Street address | 必填，带搜索图标；提示接入 Canada Post AddressComplete；**PO Box 拦截**：“Cabinets and panels ship by freight — we can’t deliver to a PO Box.” |
| Unit / suite | 可选 |
| City | 必填 |
| Province / territory | 必选，13 省 / 地区（value 为两字母代码） |
| Postal code | 自动大写 + 第 4 位补空格；正则 `^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] \d[ABCEGHJ-NPRSTV-Z]\d$`；**FSA 首字母与省份交叉校验**（如 `M5J 2J2` + Manitoba → “This postal code is in Ontario, but you chose Manitoba. Check one of them.”）；通过后绿色 “Looks good” |
| Phone | 可选；+1 前缀，10 位且首位 2–9，自动格式 `(204) 555-0142`；提示承运商可能电话 / 短信 |
| Delivery instructions | 可选 ≤ 140 字符，实时计数 |
| 默认勾选 | Set as default shipping / billing；第一条地址默认两者勾选；编辑当前默认地址时对应勾选禁用并提示“到另一地址上设为默认” |

- 提交：前端全量校验 → 按钮 loading 700 ms → 关闭弹窗 + Toast “Address added / updated”。
- 删除确认（共用 confirm 弹窗）：展示一行地址；若为默认则说明将自动指派另一地址；若被 N 张卡用作账单地址则提示结算时需更新；“Open orders already shipping here aren’t affected.”

## 9. Payment methods · 已保存银行卡

原型状态：`account.html?demo=cardAdd|cardEdit|cardErr|cardDeclined|cardEmpty#payment`，`?modal=removeCard`。

**列表**

- 单卡片列表：品牌标（Visa / Mastercard / Amex，按各品牌规范不重新着色）· “Visa •••• 4242” · 芯片 `Default`（navy）/ `Expires soon`（≤ 90 天，orange）/ `Expired`（error，整行文字变灰）· 次行 “Expires MM/YY · 持卡人 · Billing: 街道, 城市 省”。
- 操作：Set default（默认卡与过期卡不显示）· Edit · Remove。上限 5 张。
- 账单地址被删除时次行红字 “address removed — update at checkout”。
- 卡片下方安全说明：PCI DSS Level 1 处理商 tokenization；Vanstro 不接触完整卡号 / CVV；Interac Debit 与 PayPal 仅结算时可用、不可保存。

**添加卡弹窗**

| 字段 | 规则 / 文案 |
|---|---|
| Card number | 仅数字，自动 4-4-4-4 分组（Amex 4-6-5）；实时品牌识别（4→Visa，51–55 / 22–27→Mastercard，34 / 37→Amex）并在右侧显示品牌标；Luhn 校验，输满后通过则绿色 “Visa card” 并自动聚焦到期日，否则 “That card number isn’t valid — check for a typo.”；不支持品牌 “We accept Visa, Mastercard and American Express.” |
| Name on card | 必填 ≥ 2 字符 |
| Expiry | 自动 `MM / YY`；月份 1–12；已过期 “This card has expired.” |
| CVV | 密文输入；3 位（Amex 4 位），placeholder 随品牌切换；`?` 提示位置 |
| Billing address | 下拉选择已保存地址（默认选中默认账单地址）+ “+ Add a new billing address…”（关闭本弹窗 → 跳地址簿并打开添加表单 → Toast 引导返回） |
| Use as default | 首张卡默认勾选 |

- 提交：loading 900 ms 模拟 tokenization；**银行拒绝**（演示卡 `4000 0000 0000 0002`）在弹窗顶部显示错误横幅：“Your bank declined this card. No charge was made. Try another card or contact your bank — a small $0 verification is normal.”
- 成功：Toast “Visa •••• 4242 saved”；若勾选默认则取消其他卡默认。

**编辑卡弹窗**：卡号显示为灰底只读 “Mastercard •••• 4444 · Can’t be edited”（要换卡号只能新增），隐藏 CVV；可改持卡人、到期日、账单地址、默认。

**删除确认**：“{Brand} •••• 1234 will be deleted from your account and our payment processor.” 若为默认卡说明下一张卡将成为默认；已下单不受影响。

## 10. 接口契约（建议）

```http
GET    /api/me/addresses                 DELETE /api/me/addresses/:id
POST   /api/me/addresses                 { label, name, company, street, unit, city, province, postalCode, phone, notes, defaultShipping, defaultBilling }
PATCH  /api/me/addresses/:id             同上（部分字段）
POST   /api/me/addresses/:id/default     { type: "shipping"|"billing" }
GET    /api/address/suggest?q=           → Canada Post AddressComplete 代理

GET    /api/me/payment-methods           DELETE /api/me/payment-methods/:id
POST   /api/me/payment-methods           { token, billingAddressId, isDefault }   // token 来自处理商前端 SDK（Stripe.js / Adyen），卡号不经过 Vanstro 服务器
PATCH  /api/me/payment-methods/:id       { cardholderName, expMonth, expYear, billingAddressId, isDefault }
```

```http
GET   /api/me                       → 用户资料、验证状态、完善度
PATCH /api/me                       { displayName, firstName, lastName, gender, birthday, language, province }
POST  /api/me/avatar                multipart image/jpeg 512×512   → { avatarUrl }
DELETE /api/me/avatar
POST  /api/me/password              { currentPassword, newPassword, signOutOthers }
POST  /api/me/contact/request       { type: "email"|"phone", value, password } → 发送 OTP
POST  /api/me/contact/confirm       { type, value, code }
POST  /api/consents                 { channel: "email"|"sms", method: "express"|"withdrawn", sourceUrl, termsVersion } → 记录时间、IP / UA（CASL 证据）
GET   /api/consents                 → 当前各渠道状态 + 历史
PATCH /api/me/notifications         { push: bool, frequency: "each"|"weekly"|"monthly" }
POST  /api/me/export                → 202 { requestId } ；24h 内重复 → 429
GET   /api/me/export/:id            → { status, downloadUrl?, expiresAt }   // 链接 7 天有效，需登录态
POST  /api/me/review-request        { decisionType: "address_validation"|"risk" } → 人工复核工单（Law 25）
GET   /api/me/sessions              DELETE /api/me/sessions/:id   DELETE /api/me/sessions?others=1
POST  /api/me/providers/:p/link     DELETE /api/me/providers/:p
POST  /api/me/delete/request        → 发送确认邮件
```
