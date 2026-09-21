# vanstro-account-ux · 部署交接（2026-09-06 更新）

上一版交接基线是 `7609abd`。本包已落到 **`4f6e972` 或之后**（访客下单、订单查询页、商品列表页、全量 SKU 目录、pretty URL）。部署以本文为准，不要再按旧 SHA 冻结契约。

| 项 | 值 |
|---|---|
| 目录 | `vanstro-account-ux/`（相对仓库根 `vanstro/`） |
| 基线提交 | `4f6e972` — *cart: merge live catalogue into CATALOG …*（含 `8a03df6` 商品页 / 目录，及此前访客下单提交） |
| 运行时 | Node **20+** · `npm install` · `npm run start`（`tsx scripts/dev-server.mts`） |
| 默认监听 | `127.0.0.1:8787`（`BIND_HOST` / `PORT` 可改） |
| 环境变量 | 已提交 `.env`（QA sandbox Moneris + ACS）。`.env.local` 可覆盖，仍 gitignore |
| 健康检查 | `GET /api/health` → `{ ok, payment, ht, mail, pos }` |

## 本次相对 `7609abd` 的更新清单（2026-09-06）

按部署影响排序。细节见 `docs/11-guest-checkout.md`。

| # | 变化 | 部署要做什么 |
|---|---|---|
| 1 | **访客下单**：未登录也能在 `checkout.html` 付款；订单 `userId: null`，凭 HMAC `accessToken` 查单 / 发票 / 重发回执 | 非 localhost **必须**设 `VANSTRO_LINK_SECRET`（否则 token 签不出来，访客成功页 / 邮件链接失效）。无新 env |
| 2 | **新页面 `order-status.html`**（订单号 + 邮箱查单；邮件签名链接 `?o=&t=`） | 要上线。邮件里的链接是 `{APP_URL}/order-status?o=…&t=…`，反代需落到这个文件（见 §反代） |
| 3 | **新页面 `products.html`** + `assets/catalogue-data.js`（140 个真实 SKU 快照，Add to cart 写 `vs.cart`） | 要上线。图片直接引用 `https://vanstro.ca/assets/products/…`，无需拷图 |
| 4 | **新 API** `POST /api/orders/lookup`、`POST /api/orders/claim`；`GET /api/orders/:no`、`/pay`、`/invoice.pdf`、`/receipt/resend` 接受访客 token | 同域挂载时把这两条也反代过来（都在 `/api/orders` 前缀下，已覆盖） |
| 5 | **服务端目录扩到全量 SKU**：`shadcn/lib/catalogue-snapshot.json` 合入 `catalogue.ts`；`cart.html` 也合入同一快照 → 主站 9 位 SKU 不再被购物车丢掉、`/api/checkout/quote` 不再报 unknown SKU（S1 / S3 关闭） | 无。价格以快照为准，主站改价要重生成快照（见 §7） |
| 6 | **dev server 支持 pretty URL 与 `/ux/` 前缀**：`/cart`→`cart.html`、`/ux/cart`→`cart.html`、`/products/anything/assets/x`→`/assets/x` | 生产反代照 §反代 配同样规则（S2） |
| 7 | 邮件：访客确认邮件 `orderUrl` → `/order-status?o=&t=`，附「Create an account」→ `/account/register?order=&email=&t=` | 反代把 `/account/register` 落到 `register.html`（或改 `shadcn/lib/orders.ts` 的路径） |
| 8 | 访客限流（内存滑窗）：下单 20/h/IP，查单 **5/15min/IP + 3/h/单 + 5/h/IP+邮箱**，重发回执 3/h/单；认领 20/h/用户 | 多实例部署时限流是**每进程**的；需要全局限流再换 Redis。未设 `TRUST_PROXY` 时用连接 IP；反代覆盖了 `X-Forwarded-For` 才设 `TRUST_PROXY=1` |
| 9 | `x-vs-user` 头各字段改为 percent-encoded（名字含 “Ève” 等非 Latin-1 字符时 fetch 会抛错） | 无；老 header 格式仍可解析 |
| 10 | 空购物车重设计；页脚 Order tracking → `order-status.html`；结账访客文案 | 无 |

## 上一次（`c6be1ad` → `7609abd`）的变化

- 经销商 **Go Cloud POS** 与顾客 **HT 网上卡** 分轨，禁止混用。
- 已提交 `.env`：克隆后即可 mock 支付 + ACS 发信（邮件改投内部箱）。生产密钥另注，勿复用 sandbox。
- 静态文件白名单；默认只绑 loopback；API 500 只回 `{ error: "internal" }`。
- HT 未知结果必须复用同一 order + token；POS `push-pos` 原子占坑，防连点双扣。
- 原型会话 `assets/session.js`（`localStorage['vs.session']`，请求头 `x-vs-user`）。
- 注册勾选对比度、账户订单筛选 / 报价、经销商结账「Place order」已进源码。

---

## 1. 这是什么

加拿大站 **账户 + 购物车 + 结账** 交付包：

- **可交互 HTML 原型**：登录 / 注册 / 忘记密码 / 个人中心 / 购物车 / 结账
- **同源 Node 服务**：静态页 + `/api/*`（handlers 在 `shadcn/app/api/`，可迁入 Next.js）
- **两条支付通道**（详见 `docs/10-pos-channel.md`）：
  1. 顾客结账 Hosted Tokenization → `POST /api/checkout/moneris/pay`
  2. 经销商用户中心「Pay」→ `POST /api/orders/:orderNo/push-pos` → Moneris Go Cloud

**不是**完整生产账号系统：登录 / 注册 / 个人中心以 UI 原型为主；`shadcn/app/api/auth/*` 是可迁入的 handler 骨架，**当前 server 未挂载 auth 路由**。订单与支付 API 已挂载。

---

## 2. 本地 / 预发怎么起

工作目录必须是 `vanstro-account-ux/`（`load-env.mts` 按 `cwd` 读 `.env`）。

```bash
cd vanstro-account-ux
npm ci          # 或 npm install
npm run start   # 读已提交 .env；可用 .env.local 覆盖
```

启动日志应类似：

```
vanstro-account-ux dev server → http://127.0.0.1:8787
  payment: mock (MONERIS_MOCK) · mail: ACS · orders: ./data/orders
```

已提交 `.env` 默认：`MONERIS_MOCK=1`、`MAIL_REDIRECT_TO` 指向内部测试箱、ACS 已填。克隆后不必再 `cp .env.example`。

| 账号 | 用途 |
|---|---|
| `demo@vanstro.ca` / `Vanstro2026!` | 顾客（结账出卡框 / HT） |
| `dealer@vanstro.ca` / `Vanstro2026!` | 经销商 Yuan（结账 Place order，账户里 Pay） |
| 注册选 Dealer + 邀请码 `VS-MB10-K4F9` | 绑定 Yuan，不能自选门店 |

---

## 3. 页面入口

两种部署方式都支持：**站点根**（`https://域名/login.html`）或 **`/ux/` 子路径 + 短路径**（`https://vanstro.ca/cart`，见 §反代）。挂子路径时必须配 `/assets/` 回落规则，否则相对 `assets/` 会 404。

| 路径 | 用途 | 上生产？ |
|---|---|---|
| `/login.html` | 登录 | 要 |
| `/register.html` | 注册 | 要 |
| `/forgot-password.html` | 忘记密码 | 要 |
| `/account.html` | 个人中心 | 要 |
| `/cart.html` | 购物车（`localStorage['vs.cart']`） | 要 |
| `/checkout.html` | 结账 / 付款（登录或访客） | 要 |
| `/order-status.html` | **新** · 访客查单（订单号 + 邮箱 / 邮件签名链接） | 要 |
| `/products.html` | **新** · 商品列表（140 SKU 快照，筛选 / 排序 / 加车） | 要 |
| `/index.html` | 目录与设计说明 | 可不上 |
| `/flows.html` · `/components.html` · `/docs/*` | 设计交付 | 可不上 |

关键静态：`assets/vi.css` · `vi.js` · `session.js` · `site-header.js` · `site-footer.js` · `storefront-chrome.css` · `moneris-client.js` · `tax.js` · **`catalogue-data.js`** · `assets/brand/*` · `assets/products/*`。

**Pretty URL（本 server 已实现，反代要对齐）**：`/<name>` → `<name>.html`（文件存在时）；`/ux/<anything>` → `/<anything>`；`/<name>/<sub…>` 仍落到 `<name>.html`，其下的相对 `assets|docs|samples/…` 归位到根。`products.html` 用绝对 `/ux/assets/…`，其它页用相对 `assets/…`，两者在本 server 与下面的 nginx 规则下都能解析。

静态白名单（其它路径 403）：根目录仅 `.(html|ico|png|svg|webp|txt)`；子目录仅 `assets/` · `docs/` · `samples/`。`data/` · `scripts/` · `shadcn/` · `node_modules/` · 点文件（含 `.env`）不可通过 HTTP 读。

---

## 4. 已挂载 API

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/health` | `{ ok, payment, ht, mail, pos }` |
| GET | `/api/me` | 会话角色（`x-vs-user`） |
| GET | `/api/dealers/invite` | 邀请码解析（不回码表） |
| GET/POST | `/api/orders` | 列表 / 创建 |
| GET | `/api/orders/:orderNo` | 详情（会话拥有者 **或** 访客 `x-vs-order-token` / `?t=`） |
| GET | `/api/orders/:orderNo/invoice.pdf` | 发票 PDF（会话 / `invoice` 链接 `?t=` / 访客 token） |
| POST | `/api/orders/:orderNo/receipt/resend` | 重发回执（访客可发、不可改邮箱；3/h/单） |
| POST | `/api/orders/lookup` | **新** · `{orderNo,email}` → `{order,accessToken}`；限流；不泄露存在性 |
| POST | `/api/orders/claim` | **新** · 会话用户认领同邮箱访客订单 |
| POST | `/api/orders/:orderNo/push-pos` | 通道 2：推 Go |
| POST | `/api/checkout/quote` | 报价 / 税（服务端按目录重计价，不信客户端 `unitCents`） |
| GET | `/api/checkout/payment-config` | `mock` / `live` + HT profile |
| POST | `/api/checkout/moneris/pay` | 通道 1：HT token 扣款（访客可用，`saveCard` 强制 false） |
| POST/GET | `/api/checkout/moneris/go/postback` | Go 回写（`?t=` HMAC，须带 `responseCode`） |

订单目录：`./data/orders`（gitignore）。进程要对它可写，或以后换 DB。

未挂载：`shadcn/app/api/auth/{register,forgot,reset,verify-email}`。

### 通道不得混用

| | 通道 1 · HT | 通道 2 · POS |
|---|---|---|
| 谁 | 顾客 | `role=dealer` |
| 何时 | 结账页 Pay | 下单后账户 → Orders → Pay |
| 成功后再打另一条 | — | HT `/pay` 打 POS 单 → **409 `wrong_channel`** |

HT 502 / `payment_unresolved`：前端必须复用同一 `order` + `lastToken`，不得另开 token（另开 → 409）。POS 同一 `idempotencyKey` 约 10 分钟内不可并行占坑。

---

## 5. 环境变量

加载顺序（`scripts/load-env.mts`）：先 `.env`，再 `.env.local`（只填尚未设置的键），再进程环境。`APP_URL` 解析失败则 fail-closed。`DEV_DEMO_USER` 与默认 `VANSTRO_LINK_SECRET` **仅当 `APP_URL` 主机是 localhost / 127.0.0.1**。

已提交 `.env` 含 QA sandbox 商户、OAuth、API Key、ACS、`MONERIS_MOCK=1`、`MAIL_REDIRECT_TO`。下面空着的要上真机再补。

| 变量 | 已提交？ | 说明 |
|---|---|---|
| `PORT` | 8787 | 监听端口 |
| `BIND_HOST` | 默认 loopback | 仅受控反代后设 `0.0.0.0` |
| `TRUST_PROXY` | 空 | 反代会覆盖 `X-Forwarded-For` 时设 `1`。未设时限流用连接 IP，不认客户端伪造的该头 |
| `APP_URL` | `http://localhost:8787` | 对外 origin，无尾斜杠；邮件链接与 HMAC 用。上线改成 `https://…` |
| `MONERIS_ENV` | `qa` | 生产改 `prod` 并换密钥 |
| `MONERIS_STORE_ID` · `MERCHANT_ID` | QA 已填 | 商户 |
| `MONERIS_CLIENT_ID` · `CLIENT_SECRET` | QA 已填 | Developer Portal OAuth |
| `MONERIS_API_KEY_PRIMARY` · `SECONDARY` | QA 已填 | API Key |
| `MONERIS_HT_PROFILE_ID` | **空** | MRC → HT；Source Domain **必须等于页面 origin**。localhost MRC 常拒 |
| `MONERIS_GO_API_TOKEN` · `IST_CONFIG` | **空** | 经销商 POS 真机 |
| `MONERIS_GO_TERMINALS` | `MB-YUAN:00000000` | `dealerId:terminalId`；真机换成真实 terminalId |
| `VANSTRO_LINK_SECRET` | localhost 默认 | Go postback 与邮件发票链接 HMAC。**非 localhost 必填** |
| `MONERIS_MOCK` | `1` | 验收 UI/邮件；沙箱真付或生产须**去掉** |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | 已填 | ACS |
| `EMAIL_FROM` · `RECEIPT_FROM` · `EMAIL_REPLY_TO` | 已填 | 发件人 |
| `MAIL_REDIRECT_TO` | 内部测试箱 | 非生产保持，避免打到真实经销商 |
| `VANSTRO_GST_HST_BN` | 已填 | 税票 |
| `VANSTRO_QST_BN` | 空 | 魁北克发票无此号会拒开 |
| `CHROME_PATH` | — | 发票 PDF；容器必设 |
| `CHROME_NO_SANDBOX` | — | 仅容器缺沙箱时 `1`，不要默认开 |

生产 / 对外预发：**不要复用** 已提交的 QA Moneris 与 ACS。换密钥后用 `.env.local` 或编排系统注入（覆盖已提交 `.env`）。

---

## 6. 建议部署步骤

1. 检出 **`4f6e972` 或之后**，`cwd` = `vanstro-account-ux`。
2. `npm ci` 或 `npm install`。
3. 预发先用已提交 `.env`（mock + 邮件改投）。对外时改 `APP_URL`，设 `VANSTRO_LINK_SECRET`，`BIND_HOST=0.0.0.0`（仅反代后），装 Chromium 并设 `CHROME_PATH`。`data/orders` 可写。
4. 进程：`npm run start`。前面 HTTPS 反代。
5. 确认 `GET /api/health`：`ok: true`，`payment: "mock"`，`mail: true`，`pos: true`（mock 下 pos 为 true）。
6. **冒烟（mock）**
   - 顾客：`demo@vanstro.ca` → `/cart.html` → checkout → New card → Pay → 成功态；发票 PDF 能下。
   - 经销商：`dealer@vanstro.ca` → checkout 无卡框 → Place order → `/account.html` Orders → Pay → 立即已付。
   - 打开 `/register.html` 勾选条款：海军蓝底、白勾。
   - **访客**：清 `localStorage['vs.session']` → `/products` Add to cart → `/cart`（该行要显示，不是空车）→ checkout 填联系人 + 地址 → New card → Pay → 成功页有 Track this order / Create an account → Track 打开 `order-status` 无需登录，发票 PDF 200。
   - `/order-status` 用订单号 + 邮箱能查到；错邮箱回「找不到」。
7. **沙箱真付（可选）**：去掉 `MONERIS_MOCK`；MRC 建 HT Profile，Source Domain = 实际 `https://域名`（不要 localhost）；`ht: true`。经销商 POS 另补 `MONERIS_GO_*` 与真实 `MONERIS_GO_TERMINALS`。
8. 生产收款：新密钥、`MONERIS_ENV=prod`、去掉 mock、收紧 `MAIL_REDIRECT_TO`（或删掉）。

进程管理（systemd / PM2 / 容器）自选；入口固定 `npm run start`。

### 反代注意

- 本包单独域名（如 `account.vanstro.ca`）：反代 `/` 与 `/api/` 到 `127.0.0.1:8787` 即可。
- **挂到 vanstro.ca 主站同域时**：只反代本包的 `/api/orders`、`/api/checkout/`、`/api/me`、`/api/dealers/invite`、`/api/health`。**不要**把整个 `/api` 指过来，会抢走主站 `/api/v1`。
- **Pretty URL / `/ux/` 前缀（S2）**：本 server 已把 `/cart`、`/ux/cart`、`/products/xxx` 都落到对应 `.html`，直接反代整个路径给 8787 即可。若静态由 nginx 直接托管（不经 Node），照下面配：

**VanStro 同域上线用精确 `location =`，不要用前缀正则。** 前缀正则 `location ~ ^/(login|...|products)(/|$)` 会把
`/products/<slug>`（PDP）和 `/account/orders` 一并吃掉，两者都必须留在主站。实际生效的配置见
仓库 `deploy/nginx-account-ux.conf`（`location fragment`，只列精确路径，不含 `products`/`account/orders`）。

`APP_URL` 仍是站点 origin（`https://vanstro.ca`），邮件链接会生成 `/order-status?o=…&t=…` 与 `/account/register?…`，上面两条 rewrite 负责落地。

---

## 7. 已知限制（勿当 bug）

- 登录 / 注册 / 个人中心是前端状态机；auth API 未挂。
- **`x-vs-user` 不是生产鉴权**，浏览器可伪造。生产必须换 cookie / IdP。
- Apple Pay / Google Pay / 已存卡 Vault：live **501**；mock 可演示。
- HT Source Domain ≠ 页面 origin → tokenize **942**。
- HT 未决（502 / 409 `payment_unresolved`）必须复用 token，不要当「再点一次换卡」。
- 商品价格来自 **静态快照**（`assets/catalogue-data.js` + `shadcn/lib/catalogue-snapshot.json`，2026-09-06 抓自 `vanstro.ca/api/v1/products`）。主站改价后要重新生成两份并重启，否则 `PAY_AMOUNT_CHANGED` / 报价对不上。快照里没有库存 / 交期，购物车一律显示 In stock · 2–3 days。
- 访客 `accessToken` **30 天过期**（lookup 会发新的）；旧的无过期 HMAC 仍接受。`?t=` 出现在邮件链接里，查单页加载后会从地址栏去掉。未设 `TRUST_PROXY` 时限流用连接 IP；`TRUST_PROXY=1` 才认 `X-Forwarded-For`。
- 新订单号带 4 位 hex 后缀（`VS-2026-004821-A3F9`）；旧格式仍可读。认领必须提交该单的 access token，不能只凭邮箱。
- 限流是每进程内存，重启即清零，多实例不共享。
- 访客不能走经销商 POS 通道（`guest_checkout_unavailable`），这是设计。
- `shadcn/components/layout/*` 依赖主站 Provider；运行时用 `assets/site-*.js`。
- 订单在本地 `data/`，不是高可用架构。

---

## 8. 文档索引

| 文档 | 内容 |
|---|---|
| `README.md` | 总览 +「部署交接」节 |
| `docs/05-checkout.md` | 结账 / Moneris HT / API 契约 |
| `docs/06-error-codes.md` | 支付与结账错误映射 |
| `docs/08-email.md` | ACS / 发件人 / DNS |
| `docs/10-pos-channel.md` | 经销商 Go Cloud POS |
| `docs/11-guest-checkout.md` | **访客下单 / 查单 / 认领**：规则、token、接口、页面、冒烟 |
| `docs/01-login.md` · `02-account.md` · `07-register.md` · `03-forgot-password.md` | 各页交互 |

部署 agent 提示词：[`deploy-agent-prompt.md`](./deploy-agent-prompt.md)。
