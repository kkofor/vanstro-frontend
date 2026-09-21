# 08 · 加拿大合规与本地化清单

覆盖 `login / register / forgot-password / account / checkout` 五个原型。每条给出：法规 → 对产品的具体要求 → 原型中的落点。法律条文以生效版本为准，此处为产品侧解读，上线前请法务复核。

## 1. 隐私 · PIPEDA 与魁北克 Law 25

| 要求 | 落点 |
|---|---|
| 收集目的明示（Law 25 §8） | 每个可选字段的帮助文案写清用途：DOB “Used only to send you a birthday offer”；性别 “Never required”；头像 “saved as 512×512, original not kept” |
| 最小化 | 注册只收姓名 + 邮箱 + 密码；手机、地址、DOB 都在需要时再收 |
| 访问 / 携带权（Law 25 §27） | Account → Privacy & your data → “Request my data”（JSON + CSV，30 天内，通常当天） |
| 删除权 + 保留例外 | “Delete account” 说明保留发票 6 年（CRA ITA §230）与同意记录 3 年（CASL 举证） |
| 自动化决策告知（Law 25 §12.1） | 头像审核、欺诈拦截、报价审批标注 “In review” 并提供 “Request a review” 人工复核链接 |
| 隐私负责人（Law 25 §3.1） | `privacy@vanstro.ca` 显示在隐私卡片；FR 页面同样显示 |
| 默认最高隐私（Law 25 §9.1） | 营销、SMS、推送全部默认关；Remember me 默认不勾 |
| 泄露通知 | 密码泄露检测（HIBP）不是“事故”，但强制重置的通知邮件属于交易类邮件 |

## 2. 反垃圾邮件 · CASL

| 要求 | 落点 |
|---|---|
| 明示同意不得预勾选 | 注册页 / 社交登录 “One last step” / 结算页营销勾选均默认关 |
| 同意文案含主体与邮寄地址 | “…from Vanstro Global Supply Inc., 200-XXXX Winnipeg, MB. Unsubscribe any time.” |
| 每个渠道单独同意 | Communications 卡：Email / SMS / Push 三个独立开关 |
| 默示同意 2 年（购买后） | Consent status 卡显示 “Implied · expires {date}” 并允许一键转明示 |
| 退订 10 个工作日内生效 | 文案 “Changes apply here immediately, and across all systems within 10 business days” |
| 记录可举证 | `consent_events` 表（见 `07-register.md §6`）；Consent status 卡展示时间 / 来源 / 条款版本 |
| 交易类邮件不受限 | Always on 卡列出：订单 / 发票 / 报价 / 安全，明确“不是营销” |

## 3. 语言 · 官方语言法与魁北克 Law 96

| 要求 | 落点 |
|---|---|
| 面向魁北克消费者的合同、售后须有法语 | Terms / Privacy / 发票 / 订单邮件全部提供 FR；`lang` 字段随账号持久化 |
| 法语不得“明显次于”英语 | EN / FR 切换器同尺寸；FR 不用更小字号 |
| 商标以外的界面文案须翻译 | 仅 “VANSTRO” 与 “YOUR GLOBAL SUPPLY PLATFORM”（注册商标口号）保留英文 |
| 文本膨胀 | FR 平均 +25–35%；按钮用 `min-width` 而非固定宽；表格列可换行但订单号 / 金额 `nowrap` |
| 数字 / 货币 / 日期 | 见 §5，一律 `Intl.*('fr-CA')`，不拼字符串 |
| 排版 | 法语冒号、问号、分号前用窄不换行空格（`\u202F`）；引号用 « »；`Intl` 已处理货币，其余由文案层负责 |

## 4. 无障碍 · AODA（安省）/ ACA（联邦）/ WCAG 2.1 AA

| 要求 | 落点 |
|---|---|
| 对比度 ≥ 4.5:1 | 深藏青 11.9:1；灰字 4.6:1；橙墨 `#8A5A0B` 4.9:1；**橙原值只做图形与徽章底色，不做文字** |
| 焦点可见 | 3px 28% 深藏青焦点环；错误态红环 |
| 表单 | 每个输入 `<label for>`；错误文案紧邻字段并带图标（不仅靠颜色）；`aria-invalid` |
| 动效 | `prefers-reduced-motion`：登录自动跳转 2.4s → 0.8s；进度条 / 税额闪烁关闭 |
| 目标尺寸 | 控件 46px；小号 36px；眼睛按钮 34×34 |
| 验证码 | 文字 CAPTCHA 提供音频替代与刷新；仅在 ≥ 3 次失败后出现 |
| 屏幕阅读器 | 横幅 `role=alert`；OTP 六格各有 `aria-label`；状态芯片有文字（不是纯色点） |
| 键盘 | 全部可 Tab；OTP 支持粘贴；模态可 Esc 关闭并还焦 |

## 5. 数据格式（加拿大）

| 数据 | 存储 | 展示 EN | 展示 FR |
|---|---|---|---|
| 电话 | E.164 `+12045550142` | `+1 (204) 555-0142` | `+1 204 555-0142` |
| 邮政编码 | `A1A 1A1`（大写，中间一个空格） | 同 | 同 |
| 省份 | ISO 3166-2 两字母 `MB` | Manitoba | Manitoba |
| 货币 | 整数分 `18420` + `CAD` | `$184.20` | `184,20 $ CA` |
| 日期 | ISO 8601 UTC | `Sep 3, 2026` | `3 sept. 2026` |
| 时间 | UTC + 用户时区（默认 `America/Winnipeg`） | `10:42 a.m. CDT` | `10 h 42 HAC` |
| 姓名 | 不拆解为首字母；允许连字符、撇号、空格、重音 | — | — |
| 性别 | `female / male / non-binary / self-described / unspecified` | 与加拿大护照 X 标记对齐 | — |

## 6. 税务 · GST / HST / PST / QST（结算）

- 目的地计税，按**收货地址省份**。税率表见 `assets/tax.js`；QST 为 tax-on-tax 已废止（2013 起 QST 按不含 GST 价计），代码中按现行规则。
- 发票必须项（Excise Tax Act §169(4) / Regs）：卖方名称与 GST/HST 号、日期、总额、各税单列、买方名称（≥ $150 时）。个人中心 “Orders” 提供 PDF 下载，保留 6 年。
- Overview “Default address” 卡显示该省税率组合（如 `GST 5% + RST 7%`），让用户在结算前有预期。

## 7. 支付 · PCI DSS SAQ A + Moneris

- 卡号只在 Moneris 托管 iframe 中输入；我方前端只拿 token。
- 已保存卡展示 `•••• 4242 · Visa · 09/28`，CVV 不存储。
- 3-D Secure 2 挑战在模态 iframe 内完成；失败文案不透露具体拒绝原因（发卡行侧）。
- 收据邮件由 `receipts@vanstro.ca` 发送，属于交易类。

## 8. 安全 · 账号

| 项 | 规则 |
|---|---|
| 密码 | 8+（三类字符）或 12+ 口令短语，泄露库比对，最近 3 次不可重用（NIST 800-63B） |
| 登录限流 | 账号 + IP：5 次失败 → 15 分钟锁；≥ 3 次失败出现 CAPTCHA |
| 新设备 | 首次登录要求 MFA（短信 6 位）；可信设备 30 天 |
| 重定向 | 白名单相对路径，其余降级到 `/account`（防 open redirect） |
| 重置 | 邮件链接 15 分钟一次性为主，短信码兜底；成功后 “Not you? Freeze account” |
| 会话 | 展示设备 / 城市 / IP / 时间；说明 IP 定位可能偏差一个省 |
| 通知 | 密码变更、新设备、邮箱变更均发安全邮件（交易类） |

## 9. 分析与追踪

- 分析 Cookie 属于“非必要”，魁北克 Law 25 要求**默认关**并可撤回；其他省目前可用默示，但产品统一按 Law 25 处理。
- 事件命名 `account.*`、`auth.*`、`checkout.*`；**不**记录密码、卡号、OTP、完整邮箱（用 hash）。
- 表单错误事件只记录错误码（`AUTH_401`），不记录用户输入。

## 10. 待法务确认

1. 发送主体邮寄地址（`200-XXXX Winnipeg, MB` 占位）。
2. 是否需要在 FR 优先省份（QC）默认以 FR 呈现（按浏览器语言 vs. 地理位置）。
3. 未验证账号 7 天清理期是否与营销团队的 nurture 流程冲突。
4. 生日字段的“每年一次修改”限制是否需要更宽松的例外（输入错误当天可改）。
