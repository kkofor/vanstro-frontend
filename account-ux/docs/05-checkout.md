# 05 · 结算 / 支付 · 交互说明

原型：`checkout.html` · 流程图：`flows.html#f9`（结算总流程）、`#f10`（Moneris 支付时序）、`#f11`（税费 / 回执 / 合规检查点）

配套代码：`assets/tax.js` · `assets/moneris-client.js`（`htMount` 真 iframe / `mockMount` 替身）· `shadcn/lib/tax.ts` · `shadcn/lib/moneris.ts` · `shadcn/lib/validators.ts` · `shadcn/lib/dealers.ts`（经销商目录 + 披露文案）

## 1. 信息架构

```
/checkout（需登录；未登录 → login.html?redirect=/checkout）
├─ Step 1  Shipping      联系人（邮箱必填 · 手机可选）· 地址簿 / 新地址 · **本地经销商**（按送达省自动指派 + 职责披露）· 配送方式（LTL / 白手套 / 经销商自提）
├─ Step 2  Review        核对订单（含经销商行）· 消费预披露（含税总额 / 送达预估 / 卖方 + 退货首联）· Terms + Privacy 必勾 · **经销商职责确认必勾** · CASL 可选 · 回执渠道
├─ Step 3  Payment       已存卡（仅 CVV）或 新卡（Moneris HT 卡框）· 账单地址 · Pay $X.XX CAD
├─ Placing order         全屏进度：授权 → 服务端 receipt → 建单 → 通知经销商 → 发回执
└─ Confirmation          订单号 · 回执渠道状态 · **经销商联系卡（职责 / 电话 / 邮件）** · 可打印税票（卖方 + 经销商栏）· “你的数据”透明卡
```

为什么 Review 放在 Payment 之前：把总额、送达预估、退货政策和同意勾选放在进入支付步之前，满足各省消费者保护法的“购买前披露”要求，也避免用户输完卡号才发现税额变化；Pay 按钮虽然是我们的，但这一步只做付款，不再插入核对。

- 精简顶栏：标准标识 + “Secure checkout” 芯片 + 三步 Stepper（已完成可点回退）+ EN/FR + Back to cart。无商城导航，减少结账分心。
- 右栏 sticky 摘要：商品、运费、**按送达省拆分的税行**、含税合计、GST/HST（及 QST）登记号、加密 / 数据驻留说明卡。税率变化时税行闪烁提示。
- 确认页：订单号可复制、回执邮件 / SMS 送达状态、Resend / Print、税票、PIPEDA 原则 8 透明清单（存了什么 / 从未接触什么）。

## 1b. 本地经销商（Dealer）披露

业务模型来自主站 [VanStro & Local Dealer Responsibilities](https://www.vanstro.ca/dealer-services-and-responsibility/)（v2026-1.3）与 [Dealer Program](https://www.vanstro.ca/dealer-program/)：**Vanstro 是平台与产品卖方，经销商是独立本地企业**。结账与所有订单文件必须在付款前把两者的边界讲清楚。

| 角色 | 负责 |
|---|---|
| **Vanstro Global Supply Inc.（Seller）** | 目录、产品定价、结账收款；产品供应与产品信息；产品政策、保修与升级处理；产品销售的税费与税票 |
| **本地经销商（Independent dealer）** | 自提与配送协调；订单沟通与交货；退货 / 换货 / 售后**第一联系人**；Dealer Services（安装、测量、设计、清运等）——由经销商自行报价、排期、开票、收款，**不在结账总额内** |

设计落点（全部由 `shadcn/lib/dealers.ts` 的 `DEALER_COPY` 单一文案源驱动，原型 `checkout.html` 中为等价的内联文案）：

1. **Step 1 · Your local dealer 卡**：按送达省列出参与经销商（radio 卡：名称、Independent dealer 标签、地址、电话、营业时间、服务芯片），默认选中首个；卡下方 `.dealer-role` 披露块 = 一句身份说明（谁是卖方 / 谁是经销商）+ “Your dealer handles / Vanstro handles” 双列 + Dealer Services 不含在总额内的边界句 + 政策链接。切换省份自动重新指派。
   - **无经销商的省**（NT / NU / YT / NB / NL / NS / PE）：显示 notice “No participating dealer in {province} yet. Vanstro fulfils this order directly”，自提不可用。
2. **配送方式**：原 “Winnipeg pickup（仅 MB）” 改为 **Dealer pickup**，地点 = 所选经销商地址；经销商不提供自提或该省无经销商时禁用并说明原因。自提的供应地 = 经销商所在省（与送达省一致）。
3. **Step 2 · Review**：新增 “Local dealer” 行（可 Edit 回 Step 1）；预披露第三格改为 **Seller: Vanstro Global Supply Inc. · returns 30 days via {dealer}**；新增**必勾**确认：“I understand {dealer} is an independent local dealer and my first contact for pickup, delivery coordination, returns and after-sales help, and that any Dealer Services are agreed and paid separately with the dealer.” 未勾 → 错误 “Please confirm you understand your local dealer’s role to continue.”，不能进入支付。服务端以 `consents.dealerRole` 记录（时间戳 + IP），种类 `dealer_role`，与 Terms 同级留证。
4. **Placing order**：进度多一步 “Notifying your local dealer”（付款批准后服务端 `dealerNotify.newPaidOrder`，经销商只拿到履约所需字段，不接触卡数据）。
5. **Confirmation**：新增 “Your local dealer” 卡（联系方式 / 服务范围 / 营业时间 / 角色说明 / Call · Email 按钮 / 政策链接）；“下一步” 文案改为经销商将联系你安排配送或自提；税票公司栏标注 **(Seller)**，四栏新增 **Local dealer**，法律行写明卖方与 “Dealer Services 不属于本发票”。
6. **邮件与 PDF**：见 `docs/08-email.md` §经销商披露。

## 2. 加拿大税（GST / HST / PST / QST）

**计税基础**：有形动产（橱柜 / 墙板 / 五金）+ 应税运费，按 **送达地址（place of supply）** 计税；自提按仓库所在省（MB）。金额一律用 **分（integer cents）** 逐行四舍五入，避免浮点误差。

| 省 / 地区 | 结构 | 税率（2026-04-01） | 发票行 |
|---|---|---|---|
| ON | HST | 13% | 一行 HST |
| NS | HST | 14%（2025-04-01 起） | 一行 HST |
| NB / NL / PE | HST | 15% | 一行 HST |
| AB / NT / NU / YT | GST | 5% | 一行 GST |
| BC | GST + PST | 5% + 7% | 两行 |
| MB | GST + RST | 5% + 7% | 两行 |
| SK | GST + PST | 5% + 6% | 两行 |
| QC | GST + QST | 5% + 9.975%（QST 按税前价计，不叠加 GST） | 两行，标签为 TPS / TVQ；须印 QST 号 |

演示购物车：Shaker 橱柜套装 $6,240 + 板墙 4 × $189 + 合页 2 × $48 = 商品 $7,092.00；LTL 运费 $249.00；应税 $7,341.00。

| 送达 | 税 | 合计 |
|---|---|---|
| MB（默认 Winnipeg） | GST $367.05 + RST $513.87 | **$8,221.92** |
| ON | HST $954.33 | $8,295.33 |
| QC | TPS $367.05 + TVQ $732.26 | $8,440.31（法文税行） |

发票必须印 GST/HST BN（Vanstro：`71411 2364 RT0001`）。魁北克订单额外印 QST 号。时间戳 `America/Winnipeg`。

地址规则与地址簿一致：PO Box 拦截（货运无法投递）、邮编 FSA 首字母 ↔ 省份交叉校验、Canada Post AddressComplete 提示。

## 3. Moneris 集成：Hosted Tokenization + REST `/payments`

**为什么不用 Moneris 自己的结账框（MCO）**：MCO 是一整块 Moneris 渲染的页面（含它的 Pay 按钮、账单表单、回执页），样式只能在 MRC 里调几种颜色，和我们的结账版式对不上。改为 **Hosted Tokenization（HT）**：Moneris 只提供一个 44px 高的小 iframe，里面是 卡号 · MM/YY · CVV 三个输入框；我们把它放进自己的 `.card-box` 里，用 query‑string CSS 对齐 `vi.css` 的输入样式，姓名、保存卡、账单地址、Pay 按钮全部是我们的控件。卡号仍然只在 Moneris 域内，Vanstro 前后端不接触 PAN → 依旧 **PCI SAQ A**。

**PCI 原则**：点 Pay 时页面向 iframe `postMessage('tokenize')`，Moneris 回一个 **一次性临时 token（`dataKey`，约 15 分钟）**；服务端拿它调 REST `POST /payments`（`paymentMethod.paymentMethodSource = TEMPORARY_TOKEN`）完成扣款。已保存卡 = `store: true` 后 Moneris 返回的 `paymentMethodId`（Vault）。**Apple Pay / Google Pay** 在 REST API 里对应 `APPLE_PAY_ENCRYPTED / GOOGLE_PAY_ENCRYPTED`，需要各钱包 SDK + 商户域名验证，**尚未接**：live 模式下 `/api/orders` 直接 501 `wallet_not_available`，页面提示改用卡；mock 模式仍可演示。

```
浏览器 (checkout.html)                 Vanstro API (shadcn/app/api)              Moneris
  │  GET /api/checkout/payment-config    │
  │◄── { mode, env, ht:{url,profileId} } │
  │  VSMoneris.htMount()  → <iframe src=HT?id=profile&css_…>   ← 卡号 / MM/YY / CVV 在 Moneris 域内
  │  客户填卡 · 姓名 · 账单地址 · 点 Pay
  │  htFrame.tokenize()  postMessage('tokenize') ─────────────────────────────►│
  │◄──────────────────────────── { responseCode:['001'], dataKey, bin } ◄──────┤
  │  POST /api/orders {cart, contact, shipping, dealer, billing, consents, payment:{new,saveCard}}
  │                                      │  校验 · 目录重定价 · 税引擎 → quote
  │                                      │  orders.create(pending) → VS-2026-xxxxxx
  │◄── { orderNo, quote, dealer, payment:{mode,env,ht,expiresAt} }
  │  POST /api/checkout/moneris/pay { orderNo, temporaryToken, cardholderName, saveCard }
  │                                      ├─ OAuth2 client_credentials（token 缓存）
  │                                      ├─ POST /payments { amount, TEMPORARY_TOKEN, billing, Idempotency-Key }
  │                                      │◄──────── PaymentResponse（responseCode 000–049 = 批准）
  │                                      │  orders.markPaid → INV-2026-xxxxxx
  │                                      │  并行：确认邮件 · 税票 PDF 邮件 · 经销商订单单
  │◄── 200 { ok, order, notifications }
  │      或 402 { code, message }（拒绝 / token 失效；订单 declined，重载 iframe 后可重试）
```

订单只在 **tokenize 成功之后** 创建（避免用户改地址、换卡时留下一堆 pending）；无法收款的情况（saved 卡、live 钱包、缺 HT profile）在持久化之前就 501/502 拒绝。**订单是否付款只以服务端 `/payments` 响应为准**（`shadcn/app/api/checkout/moneris/pay/route.ts` 是唯一把订单标为 paid 的地方）。`Idempotency-Key = orderNo-createdAt`，网络抖动后的重发返回首个结果。

**模块分工**

| 文件 | 职责 |
|---|---|
| `shadcn/lib/moneris.ts` | REST 客户端：`accessToken()`（OAuth2 缓存）· `createPayment()`（`POST /payments`，`MonerisApiError` 带 Moneris 原始校验信息）· `hostedTokenization()`（HT URL + profile）· `isApproved` / `brandName` |
| `shadcn/lib/payments.ts` | `paymentSession(order)`（浏览器渲染卡框所需信息）· `chargeOrder(order, {temporaryToken,…})`；`MONERIS_MOCK=1` 时不出网，token 形如 `mock:<Brand>:<last4>`，用测试卡尾号 / 分位模拟批准与拒绝 |
| `shadcn/lib/orders.ts` | 订单模型 + 文件仓储（`data/orders/*.json`）：订单号 / 发票号序列、`markPaid` / `markDeclined`、通知日志；pending 30 分钟后清为 expired |
| `shadcn/lib/order-notify.ts` | 付款后三封邮件（客户确认、税票 + PDF、经销商订单单），互不阻塞，结果写回订单 |
| `shadcn/lib/checkout.ts` | `DECLINE_MESSAGES`：050 / 051 / 076 银行拒绝 + `token_rejected`（临时 token 过期或无效，措辞是“请重新输入卡”，不是“银行拒绝”）EN/FR |
| `assets/moneris-client.js` | 浏览器侧：`paymentConfig` · `htMount`（真 iframe，`tokenize()` / `reset()`）· `mockMount`（同版式替身，Luhn / 有效期 / CVV 本地校验）· `createOrder` · `pay` · `resendReceipt` · `invoicePdfUrl` |
| `shadcn/components/checkout/moneris-hosted-fields.tsx` | 同一卡框的 React 版（forwardRef：`tokenize()` / `reset()`），供正式站接入 |
| `scripts/dev-server.mts` | 本地：静态原型 + 上述 API 同源挂在 `:8787`；`npx tsx scripts/dev-server.mts` |

**HT iframe 样式**：Moneris 只允许通过 URL 参数注入 CSS（`css_body` · `css_textbox` · `css_textbox_pan/exp/cvd`），无法引外部样式表，所以 `moneris-client.js` 里的 `htParams()` 手工镜像 `vi.css` 的 `.control input`（44px 高、15px、无边框、透明背景；边框与 focus 环由外层 `.card-box` 画）。`display_labels=2` 用占位符做标签，可见标签在 iframe 外。`enable_cc_formatting / enable_exp_formatting` 让 Moneris 自己做 4‑4‑4‑4 与 MM/YY 分隔。**Profile 的 source domain 必须与页面 origin 完全一致**（含协议、端口），否则 tokenize 返回 `942`。

| 环境 | HT iframe | REST API |
|---|---|---|
| Sandbox / QA | `https://esqa.moneris.com/HPPtoken/index.php` | `https://api.sb.moneris.io` |
| Prod | `https://www3.moneris.com/HPPtoken/index.php` | `https://api.moneris.io` |

环境变量（`.env.local`，不要提交真实值）：

```
MONERIS_ENV=qa
MONERIS_MERCHANT_ID=       # Developer Portal → Test Merchant ID
MONERIS_CLIENT_ID=         # Developer Portal → Application (Client) ID
MONERIS_CLIENT_SECRET=     # Developer Portal → Secret
MONERIS_HT_PROFILE_ID=     # MRC → Admin → Hosted Tokenization；Source Domain 须与页面 origin 完全一致（MRC 常拒 localhost，用正式域 / hosts / 隧道）
MONERIS_MOCK=1             # 本地离线；去掉即打 sandbox（此时必须有 MONERIS_HT_PROFILE_ID）
VANSTRO_GST_HST_BN=
VANSTRO_QST_BN=
```

**验证记录（2026‑09‑05）**
- Sandbox 凭据：OAuth2 `client_credentials` 拿到 token；直接以商户采集卡数据调 `POST /payments`（`4242…`，expiry 用整数）返回批准 → REST 链路可用。
- mock 全链路：`step3New` 填 `4242…` → tokenize → `/api/orders` → `/pay` → 订单 paid、`INV-2026-004830`、三封邮件、Vault token 已存；`payDeclined` → 402 `076` 横幅；空字段 → 卡框逐字段报错。
- live 边界：无 HT profile 时 `/api/orders` 502 `payment_unavailable` 且 **不落库**；`apple_pay` → 501 `wallet_not_available` 不落库；用假 token 打 `/pay` → Moneris 返回 400 schema 错误（token 最短 25 位）→ 映射为 402 `token_rejected`。
- **待办（需要 MRC 操作）**：在 esqa MRC 新建 HT profile，Source Domain 填部署后的页面 origin（例如 `https://www.vanstro.ca`；`localhost` 常被表单校验拒绝）。Profile ID 写入 `MONERIS_HT_PROFILE_ID`，去掉 `MONERIS_MOCK` 即可端到端跑真 iframe。公开示例 profile（`ht1TTK3NZLJ82PE`）不能借用（942）。

**禁止**把 `client_secret` 下发到浏览器。`amount` 必须由服务端按税引擎重算，不得信任前端总额。

### 支付结果与 UI

| 结果 | Moneris | UI |
|---|---|---|
| 批准 | `transactionDetails.responseCode` 000–049 | Placing order 进度 → Confirmation |
| 拒绝 | response_code ≥ 050（050 一般拒绝 · 051 卡过期 · 076 余额不足） | 红色横幅 “No charge was made”，停留 Step 3，可换卡；已存卡拒绝时提示改用其他卡 |
| 3-D Secure 挑战 | ACS 挑战页 | Dialog 内嵌发卡行页；OTP 通过 → 继续；失败 → 视为拒绝 |
| 卡框校验错误 | tokenize 返回 943 卡号 · 944 有效期 · 945 CVV | 卡框描红 + 字段提示（HT 不能在 iframe 内画错误，由我们在外层提示） |
| 临时 token 过期 / 无效 | `/payments` 4xx → `token_rejected` | 黄色横幅 “Please re-enter your card”，重载 iframe |
| 待支付订单过期（30 min） | `/pay` 410 `order_expired` | Session expired Dialog → “Reload payment” |
| 网络错误 | 无回调 | 横幅 + Retry，不重复下单（order_no 幂等） |

原型演示卡（仅 `mockMount` 内部使用，不上送；服务端 mock 按 token 里的末四位判定）：

| 卡号 | 结果 |
|---|---|
| `4242 4242 4242 4242` | 批准 → 回执 |
| `4000 0000 0000 0002` | 拒绝 · 076 余额不足 · 未扣款 |
| `4000 0000 0000 0069` | 拒绝 · 051 卡过期 |
| `4000 0000 0000 3220` | 3-D Secure；OTP `123456` 通过 / 其他失败 |

## 4. 即时回执

服务端 `receipt` 成功后 **同步入队、立即发送** 交易邮件（CASL 下的交易性信息，不需要营销同意）。若用户在 Step 2 勾选 SMS，同时发送短信摘要。确认页显示：

- 成功态 + 订单号（Copy）+ 下单时间（CT）
- 回执渠道卡：Email sent / SMS sent 与时间；邮件失败时显示 “Delivery failed” + Resend + Change email
- Print invoice / Download PDF
- 税票：商品行、运费、分税行、含税总额、GST/HST（QST）号、授权码、Moneris 参考号、卡品牌与末四位、送达 / 账单地址
- “Your data, transparently” 双列卡：Vanstro 存了什么（订单 / 地址 / 同意时间戳 / 卡 token 与末四位），从未接触什么（PAN / CVV / 3DS 凭据）

## 5. PIPEDA / Law 25 / CASL / 消费者保护

| 要求 | 设计 |
|---|---|
| 目的限定 | 每组字段下方说明用途（回执 / 承运商联系 / AVS） |
| 明示同意 | Step 2 必勾：Terms of Sale、Privacy Policy（含收集范围与 CRA 6 年留存）；未勾 → 错误摘要 “Please accept the terms…”，不可进入支付 |
| 透明 | 顶栏 Secure 芯片 → 安全声明 Dialog；Step 1 “How we use this information” → 隐私通知 Dialog（谁 / 什么 / 为何 / 何处 / 多久 / 权利 / 加密） |
| 最小必要 | 与 Moneris、承运商、CRA 共享的字段逐项写明 |
| 魁北克 Law 25 | 送达 QC 时税行、税票与同意区切法文；隐私通知列出隐私官联系方式与访问 / 更正 / 删除权 |
| CASL | 回执为交易邮件；营销 checkbox 默认关闭，勾选记录时间戳，链到账户里的 CASL 开关 |
| 消费者保护（购买前披露） | Step 2 明示含税总额 CAD、送达预估、退货政策（30 天、未使用、原包装），再进入支付 |
| 加密声明 | TLS 在途、AES-256 静态、数据在加拿大区域、日志禁止 PAN / CVV |

## 6. 字段规则

| 字段 | 规则 |
|---|---|
| Email | 必填；回执与发票；`validators.ts` `email` |
| Mobile | 可选；`^[2-9]\d{9}$`（+1）；仅用于承运商更新与 SMS 回执（Step 2 勾选） |
| 已存地址 | radio 卡；深藏青描边；显示 Default 标签 |
| 新地址 | 街道必填；PO Box 拦截；邮编自动格式 `A1A 1A1` + FSA ↔ 省交叉校验；城市 / 省必填 |
| 本地经销商 | 送达省有参与经销商时必选其一（默认首个）；`dealerId` 必须属于送达省；该省无经销商时 `null` |
| 配送方式 | LTL $249 / 白手套 $599 / 经销商自提 $0（仅所选经销商提供 pickup 时可选，否则禁用并回退 LTL） |
| 经销商职责确认 | 有经销商时必勾（`consents.dealerRole`）；记录时间戳 + IP，种类 `dealer_role` |
| Delivery notes | 可选，≤ 140 字，随货运单 |
| 账单地址 | 默认同收货（AVS）；可选地址簿其他地址或新填 |
| 已存卡 | radio + 内嵌 CVV（3 位，Amex 4 位）；Expires soon 标签；服务端用 Vault token 走 Purchase |
| 新卡 | 卡号 · MM/YY · CVV 在 Moneris HT iframe 内（我们的 `.card-box` 包着）；持卡人姓名、“Save card”（Vault）是我们的控件；品牌角标按 BIN 前缀显示 |
| Pay 按钮 | `Pay $X.XX CAD`（含税总额）；我们的按钮：tokenize → 建单 → 扣款；提交后禁用并显示进度 |

## 7. 接口契约

```http
POST /api/checkout/quote
{ province, items: [{ sku, qty, unitCents }], freightCents }
→ { taxableCents, lines: [{ code, label, rate, cents }], taxTotalCents, totalCents, gstHstBn, qstBn?, asOf }

GET  /api/checkout/payment-config    → { mode: 'live' | 'mock', env, ht: { url, profileId } | null, configured }   // 公开，页面加载卡框前调

POST /api/orders                     // 创建待支付订单；服务端目录重定价 + 重算税；不出网
{ cart: [{ sku, name, unitCents, qty }],            // unitCents 仅作展示校对，服务端以目录价为准
  contact: { email, phone? },
  shipping: { addressId } | { address },
  dealer: { dealerId | null },
  deliveryMethod: 'freight' | 'white' | 'pickup', notes?,
  billing: { sameAsShipping: true } | { sameAsShipping: false, addressId | address },
  consents: { terms: true, privacy: true, marketing, smsReceipt, dealerRole },
  payment: { method: 'new', saveCard } | { method: 'apple_pay' } | { method: 'google_pay' } | { method: 'saved', cardToken },
  locale: 'en-CA' | 'fr-CA' }
→ 200 { orderNo, txnTotalCents, quote, dealer, payment: { mode: 'live' | 'mock', env, ht: { url, profileId } | null, expiresAt } }
// 400 invalid_request（zod issues）· address_not_found · unknown_sku · dealer_not_found · dealer_province_mismatch
//     · dealer_required（该省有经销商却传 null）· pickup_unavailable
// 501 saved_card_not_available（Vault 购买待接）· 501 wallet_not_available（live 钱包待接）· 502 payment_unavailable（缺 MONERIS_HT_PROFILE_ID）
//     以上三种在落库之前拒绝，不产生 pending 订单
// 订单快照 seller = "Vanstro Global Supply Inc."，dealer = DealerSnapshot | null（邮件与 PDF 按快照渲染）

POST /api/checkout/moneris/pay       { orderNo, temporaryToken, cardholderName?, saveCard?, hint? }   // hint 仅 MONERIS_MOCK 生效
→ 200 { ok: true, order, notifications: { confirmation, invoice, dealer } }   // 幂等：已付款再调返回 alreadyPaid
→ 402 { ok: false, orderNo, code, message, detail? }   // code: 050/051/076… 银行拒绝 · token_rejected 临时 token 失效；订单 declined，重载卡框后可重试
→ 404 order_not_found · 410 order_expired

GET  /api/orders                     → { orders: [PublicOrder] }（本人）
GET  /api/orders/:orderNo            → { order }（本人）
POST /api/orders/:orderNo/receipt/resend   { kind: 'confirmation' | 'invoice', email? }   // 限频
GET  /api/orders/:orderNo/invoice.pdf      // 按需渲染（headless Chromium）
```

## 8. 原型状态（右下角面板 / URL）

`checkout.html?export=1&demo=<state>&prov=<CODE>`；`export=1` 隐藏面板。

| `demo=` | 状态 |
|---|---|
| `step1` / `step1Err` / `step1Fsa` | Shipping · 新地址校验错误 · 邮编与省不符 |
| `step2` / `step2Err` | Review · 未接受条款 |
| `step3` / `step3New` | Payment · 已存卡 / 新卡（HT 卡框） |
| `pay3ds` / `payDeclined` / `payExpiredCard` / `payFrameErr` | 3-D Secure · 拒绝 076 · 卡过期 051 · 卡框校验错误 |
| `ticketExpired` / `placing` | 支付会话过期 · 确认中 |
| `done` / `doneSms` / `doneEmailFail` / `doneVault` | 确认 · 含 SMS · 邮件失败 · 已保存新卡 |
| `prov=MB|ON|QC|AB|BC|NS` | 切换送达省并重算税（QC 切法文税行） |
| `modal=security|privacy` | 安全声明 / 隐私通知弹窗 |
