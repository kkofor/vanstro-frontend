# 11 · 访客下单（Guest checkout）

未登录用户可以在 `checkout.html` 直接下单付款，事后用「订单号 + 邮箱」或邮件里的签名链接查单，注册后一键把访客订单挂到账号上。

## 规则

| | 登录顾客 | 访客 |
|---|---|---|
| 联系人 | 账号邮箱 | 结账页填 first / last / email（必填） |
| 地址 | 地址簿 或 新地址；可勾「保存到地址簿」 | 只能内联填写；无「保存」；账单地址不同时内联再填一份（`billForm`） |
| 支付 | HT 新卡 / 已存卡；可勾「保存此卡」 | 只能 HT 新卡；`saveCard` 服务端强制 `false` |
| 经销商 POS 通道 | `role=dealer` 会话 | **不可用**（POS 必须有会话） |
| 订单归属 | `userId` | `userId: null`，`email` 为唯一凭据 |
| 后续访问 | 会话 | `accessToken`（HMAC，`order-access` 用途） |

访客创建订单时 `POST /api/orders` 按 IP 限流：**20 单 / 小时**。

## 访问令牌

- 由 `shadcn/lib/order-access.ts` 用 `VANSTRO_LINK_SECRET` 签发，purpose = `order-access`，与订单号绑定；**30 天过期**（`mac.exp`）。lookup 会发新 token。旧的无过期 HMAC 仍接受。
- 客户端传法：请求头 `x-vs-order-token: <token>`，或查询串 `?t=<token>`（PDF 下载、邮件链接）。
- 前端保存在 `localStorage['vs.orderTokens']`（按订单号），`assets/session.js` 的 `VSSession.orderToken / setOrderToken`；`assets/moneris-client.js` 会在 `pay / resendReceipt / invoicePdfUrl / getOrder` 里自动带上。
- 无会话时前端额外发 `x-vs-guest: 1`，让 localhost 的 `DEV_DEMO_USER` 兜底不生效（仅开发环境有意义，生产忽略即可）。

## 接口变化

| 方法 | 路径 | 变化 |
|---|---|---|
| POST | `/api/orders` | 无会话也接受；必须带 `contact{firstName,lastName,email}` + 内联 `shipping`（及 `billing`）；返回 `{ order, accessToken }`，`order.guest: true` |
| GET | `/api/orders/:orderNo` | 会话拥有者 **或** 有效 `order-access` token |
| POST | `/api/checkout/moneris/pay` | 同上；访客 `saveCard` 强制 false |
| GET | `/api/orders/:orderNo/invoice.pdf` | 会话 / `invoice` 链接 token / `order-access` token 三者任一 |
| POST | `/api/orders/:orderNo/receipt/resend` | 访客可重发，但**不能改收件邮箱**；限流 3 次 / 小时 / 单 |
| POST | `/api/orders/lookup` | **新**。`{ orderNo, email }` → `{ order, accessToken }`；限流 5 / 15 分 / IP，3 / 小时 / 单，5 / 小时 / IP+邮箱；查不到与邮箱不匹配都回 404 |
| POST | `/api/orders/claim` | **新**。需会话 + body `{ tokens: { [orderNo]: accessToken } }`；只认领邮箱匹配且 token 有效的访客单。缺 proof → 403 `claim_proof_required` |

错误码新增：`guest_address_required`、`guest_checkout_unavailable`（访客走 POS）、`rate_limited`（429）、`claim_proof_required`（403）。见 `docs/06-error-codes.md`。

新订单号：`VS-YYYY-NNNNNN-XXXX`（4 位 hex，防顺序扫号）。旧 `VS-YYYY-NNNNNN` 仍可读。

## 页面

| 页 | 行为 |
|---|---|
| `checkout.html` | 顶部联系卡按 `VSSession.isSignedIn()` 切换「Signed in as」/「Checking out as a guest（Sign in）」。成功页对访客显示 **Track this order**（`order-status.html?o=…&t=…`）和 **Create an account**（`register.html?order=…&email=…&from=checkout`），并把 `{orderNo,email,at}` 写进 `localStorage['vs.lastOrder']` |
| `order-status.html` | **新**。三种进入方式：邮件签名链接 `?o=<orderNo>&t=<token>`；本机有 token；否则显示「订单号 + 邮箱」查询表单 → `lookup`。展示时间线、明细、配送与联系人，访客可发票 PDF / 重发回执，并有「创建账号」卡 |
| `register.html` | 带 `order=` 进入时读取真实订单（`VSMoneris.getOrder`），预填邮箱、姓名，注册成功后调用 `claimOrders()` 并显示已挂上的订单号 |
| `cart.html` 空态 | 访客文案改为「kept in this browser」，右侧「Track an order」→ `order-status.html`；信任区显示「Check out as a guest — no account needed」 |
| 页脚 | Customer Support → Order tracking 指向 `order-status.html` |

## 邮件

访客确认邮件 `orderUrl` 指向 `/order-status?o=…&t=…`（而不是 `/account#orders`），并多一段「Create an account」链接到 `{APP_URL}/account/register?order=…&email=…`。**主站 / 反代需把 `/order-status` 与 `/account/register` 落到本包的 `order-status.html` / `register.html`**（见 09 §反代）。`shadcn/emails/orders.ts`。

## 冒烟（mock）

1. 未登录（或 `localStorage.removeItem('vs.session')`）→ `/products` 加一件 → `/cart` → Proceed → 填联系人 + 地址 → New card → Pay → 成功页有 Track / Create an account。
2. 点 Track → `order-status.html` 无需登录显示订单；发票 PDF 200。
3. 清 `vs.orderTokens` 后访问 `/order-status` → 用订单号 + 邮箱查到同一单；错邮箱 → 404 文案。
4. Create an account → 注册（mock）→ 成功页出现「已挂上订单 VS-…」；`GET /api/orders`（带该会话）能列到它。
5. `curl -X POST /api/orders/lookup` 同 IP 连打 6 次 → 第 6 次 429。
6. 伪造 `x-vs-user` 且不带 token 调 `POST /api/orders/claim` → 403 `claim_proof_required`。
