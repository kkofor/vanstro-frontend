# 08 · 交易邮件（Azure Communication Services）

账户体系的 4 封交易邮件，全部经 **Azure Communication Services Email**（资源 `acs-vanstro-ca`，数据驻留：加拿大）从 `mail.vanstro.ca` 子域发出。主域 `vanstro.ca` 的 M365 收发不受影响；Reply-To 指回 `support@vanstro.ca`。

## 发件身份

| 用途 | From | Reply-To |
|---|---|---|
| 账户邮件（验证 / 欢迎 / 重置 / 密码已更改） | `Vanstro Global Supply <no-reply@mail.vanstro.ca>` | `support@vanstro.ca` |
| 订单邮件（下单确认 / 发票） | `Vanstro Global Supply <receipts@mail.vanstro.ca>` | `support@vanstro.ca` |

收件人看到的发件人名称由 ACS 的 sender username 决定（不是 SDK 参数）：`az communication email domain sender-username update --display-name "Vanstro Global Supply"`，两个用户名都已设置。邮件头部 logo 直接引用主站资源 `https://www.vanstro.ca/assets/vanstro-logo.png`（160×32 显示）。

DNS（GoDaddy）：`mail` TXT 域验证 + SPF、`selector1/2-azurecomm-prod-net._domainkey.mail` CNAME（ACS DKIM）、`selector1/2._domainkey` CNAME（M365 DKIM）、`_dmarc` → `p=quarantine; rua=mailto:dmarc@vanstro.ca`。

## 4 封模板（EN-CA / FR-CA）

| # | 模板 | 触发 | 链接有效期 | 备注 |
|---|---|---|---|---|
| 1 | `verifyEmail` | 注册 / 重发 / 改邮箱 | 24 h | 未验证也可下单；保存卡片、评价需验证 |
| 2 | `welcome` | 验证成功后 | — | WELCOME15 在此发放（不在注册时），防一次性邮箱刷码 |
| 3 | `resetPassword` | 忘记密码 | 15 min，单次 | 含请求时间 + 「Winnipeg, MB · Chrome on macOS」上下文 |
| 4 | `passwordChanged` | 重置成功 | — | 安全通知；「不是我 → 冻结账户」按钮 |

## 2 封订单邮件（EN-CA / FR-CA，`receipts@`）

| # | 模板 | 触发 | 内容 |
|---|---|---|---|
| 5 | `orderConfirmation` | 服务端 Moneris receipt 批准后立即发 | 订单号 + 下单时间、明细表、小计 / 运费 / 分省税行 / 总计、配送方式 + ETA（自提则显示**经销商**地址；配送则写明经销商将来电协调）、收货地址、支付卡尾号 + 授权码 + **Seller 行**、**「Your local dealer and their role」经销商卡**、「查看订单」；提示正式发票另发；页脚按事务分流（自提 / 配送 / 退货找经销商，产品与政策找 support@） |
| 6 | `invoice` | 确认后随即发送；账户内可重发 | 发票号 / 日期 / 订单号 / **Seller** / **Local dealer** / 已付状态 + Moneris 参考号、**GST/HST BN**、魁北克订单加 **QST 号**、Bill to / Ship to、明细与税行、经销商边界说明、下载 PDF 按钮；**PDF 随附件发送**（`sendMail({ attachments })`，ACS 上限 10 MB） |
| 7 | `dealerNewOrder`（`emails/dealer.ts`） | 与 5 / 6 同时发给所选经销商 `dealer.email` | 经销商订单单：订单号、付款时间、客户姓名 / 邮箱 / 电话、收货地址、明细、配送方式（自提 / 配送）、客户备注；**不含**卡信息、同意记录、IP（数据最小化）。魁北克经销商收法文版 |

### 付款后的发送编排（`shadcn/lib/order-notify.ts`）

`POST /api/checkout/moneris/pay` 拿到 Moneris `POST /payments` 的 SUCCEEDED 回执并 `markPaid` 后调用 `notifyPaidOrder(order)`：三封邮件 `Promise.allSettled` 并行，任一失败不影响其他两封，也不影响返回给浏览器的「付款成功」。每封的 `sentAt` / `failed` 写进订单 `notifications[]`，接口把 `{ confirmation, invoice, dealer }` 一并返回，确认页据此显示「Receipt sent / Delivery failed → Resend」以及「Dealer notified」。

本地调试开关（`shadcn/lib/mail.ts`）：`MAIL_DRY_RUN=1` 只打日志不出网；`MAIL_REDIRECT_TO=you@x.com` 把所有邮件（含发给经销商的）改投到一个测试邮箱。

### 经销商披露（两封订单邮件 + PDF 共用）

来源 [VanStro & Local Dealer Responsibilities](https://www.vanstro.ca/dealer-services-and-responsibility/)。文案与数据单一来源 `shadcn/lib/dealers.ts`（`DEALER_COPY` EN/FR、`DealerSnapshot`），订单创建时把所选经销商快照进订单，邮件与 PDF 只读快照，经销商日后改名 / 换电话不影响历史文件。

- **`dealerBlock()`**（`emails/orders.ts`）：左列经销商名 + Independent dealer 标签 + 地址 + 营业时间 + 服务芯片；右列电话 / 邮件（mailto 预填订单号）；下方灰底说明：身份句（谁是卖方 / 谁是经销商）→ “Your dealer handles / Vanstro handles” 双列 → Dealer Services 不含在订单总额内 + 政策链接。纯文本版 `dealerText()` 同步输出。
- **`dealer: null`**（送达省无经销商）：改为 “Order fulfilment” 块，说明 Vanstro 直接履约与联系方式。
- **PDF**：公司栏标 **SELLER**；Bill to / Ship to / **Local dealer** 三栏（自提时 Ship to 显示经销商地址）；Terms 第一条 “Sold by Vanstro Global Supply Inc. {dealer} is an independent local dealer … Dealer Services are not part of this invoice”。

### 发票 PDF

- 模板：`shadcn/emails/invoice-pdf.ts`，版式沿用 VanStro 报价单（Letter 8.5×11 in，纯嵌套表格、无 webfont、logo base64 内嵌，跨页自动重复列头与页脚）。
- 渲染：`shadcn/lib/invoice-pdf.ts` 用 headless Chromium `--print-to-pdf`（本地走已安装的 Chrome，生产设 `CHROME_PATH`，或换 Playwright，HTML 自包含）。
- 下载：`GET /api/orders/:orderNo/invoice.pdf`（仅订单所有者，从下单快照渲染，不重算）。
- 内容：公司名 + GST/HST BN（QC 加 QST）、发票号 / 日期 / 订单号、Paid 标记、Bill to / Ship to、明细、分省税行、Total / Paid / Balance due $0.00、支付方式 + 授权码 + Moneris 参考号、条款。满足 CRA ≥ $150 的 ITC 发票要素。
- 样例 PDF 会写到 `samples/`，本地 8787 服务器可直接下载。

金额全部来自服务端 `quoteCheckout()` 的整数分，税行直接复用 `lib/tax.ts` 的 `TaxLine`（EN/FR 标签自带）。

全部为 CASL 意义下的交易邮件：无退订链接、不夹带促销内容。表格布局 + 内联样式（Outlook 安全），品牌色沿用 `assets/vi.css`：navy `#004744`、orange `#F28C28`。

## 代码位置

```
shadcn/lib/mail.ts            ACS 封装：sendMail()，429/5xx 按 Retry-After 重试 ≤3 次，maskEmail()
shadcn/lib/tokens.ts          32 字节 base64url token，只存 SHA-256；verify 24h / reset 15min
shadcn/emails/layout.ts       邮件外壳（品牌头、按钮、页脚、纯文本降级）
shadcn/emails/index.ts        4 个账户模板函数，返回 { subject, html, text }；re-export 订单模板
shadcn/lib/dealers.ts         经销商目录（镜像主站 dealer map）、快照类型、EN/FR 披露文案 DEALER_COPY
shadcn/emails/orders.ts       orderConfirmation / invoice（明细表、税行、地址、支付块、dealerBlock 经销商披露）
shadcn/emails/dealer.ts       dealerNewOrder 经销商订单单（EN / FR by 经销商所在省）
shadcn/lib/order-notify.ts    付款后编排：确认 + 发票 PDF + 经销商单，结果写回订单 notifications[]
shadcn/lib/orders.ts          订单模型 + 文件仓储 data/orders/*.json（本地；生产换 DB 实现同一 OrderRepo 接口）
scripts/dev-server.mts        本地同源服务：静态原型 + /api/*（npx tsx scripts/dev-server.mts → :8787）
shadcn/emails/invoice-pdf.ts  发票 PDF 的 HTML 模板（Letter，报价单同款版式）
shadcn/lib/invoice-pdf.ts     HTML → PDF（headless Chromium）
shadcn/app/api/orders/[orderNo]/invoice.pdf/route.ts  下载发票 PDF
shadcn/app/api/orders/[orderNo]/receipt/resend/route.ts  重发确认邮件或发票（kind=confirmation|invoice，发票带 PDF 附件）
shadcn/app/api/auth/
  register/route.ts           201 · 建号 + 记录同意 + 发验证邮件；409 email_exists
  verify-email/route.ts       200 · 标记已验证 + 登录 + 发欢迎邮件；410 token_invalid/expired
  verify-email/resend/route.ts 202 · 60 s 冷却，3/h/邮箱；始终 202
  forgot/route.ts             202 · 3/h/邮箱、10/h/IP；始终 202（不暴露账号是否存在）
  reset/route.ts              200 · 校验 token + 密码策略（8+/泄露/近 5 次/与当前相同）+ 轮换会话 + 发安全通知
scripts/send-samples.mts      发样例：npx tsx scripts/send-samples.mts you@x.com [en|fr|both] [all|account|orders|verify,invoice…]（DRY_RUN=1 只渲染到 /tmp/vanstro-mail）
scripts/send-test-mail.mjs    链路冒烟
```

路由沿用 checkout 切片的写法：`db / sessions / passwords / rateLimit / describeRequest` 以 `declare` 声明，接入时替换为真实实现即可。

## 环境变量

发信与 QA sandbox Moneris 在已提交的 `.env`。本机可用 `.env.local`（gitignore）覆盖。`scripts/load-env.mts` 先读 `.env` 再读 `.env.local`。

```
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://acs-vanstro-ca.canada.communication.azure.com/;accesskey=…
EMAIL_FROM=Vanstro Global Supply <no-reply@mail.vanstro.ca>
RECEIPT_FROM=Vanstro Global Supply <receipts@mail.vanstro.ca>
EMAIL_REPLY_TO=support@vanstro.ca
APP_URL=https://account.vanstro.ca
# 本地调试（可选）
MAIL_DRY_RUN=1                  # 只打日志
MAIL_REDIRECT_TO=you@x.com      # 所有邮件改投到这个地址
```

## 配额与后续

- ACS 自定义域默认配额：30 封/分、100 封/小时（订阅级）。上线前在 Azure 门户申请提额。
- 发送失败不阻断用户请求（fire-and-forget + 日志）；正式环境建议接队列重试。
- 可选：Event Grid 订阅 `EmailDeliveryReportReceived` / `EmailEngagementTrackingReportReceived`，用 `X-Vanstro-Tag` 头做关联。
