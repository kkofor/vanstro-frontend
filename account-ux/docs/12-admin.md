# 12 · 运营后台（Ops console）

内部员工**操作**本包已经落地的店：改客户订单、看支付、做风控、看流量与销售报表、改目录 / 经销商、写顾客备注。页面：`admin.html`（pretty `/admin`）。不是只读看板。

布局：左侧固定导航（Overview / Sales / Growth / Catalogue / Admin），右上全局跳转框（输入订单号直达订单、输入邮箱直达顾客、其它当搜索），以及统一时间窗（今日 / 7 天 / 30 天 / 全部，记在 `localStorage vs.ops.win`，Dashboard、Payments、Traffic、Reports 共用）。侧栏角标：待付款数、未决尝试、风控高危 + hold、当前在线访客。

## 谁能进

| 账号 | 密码 | 会话 |
|---|---|---|
| `ops@vanstro.ca` 或 `admin@vanstro.ca` | `Vanstro2026!` | `{ role: "staff", userId: "usr_staff_ops" }` |

顾客 / 经销商会话打 `/api/admin/*` 一律 **403 `forbidden`**。也可从 `login.html` 用 ops 账号登录，成功后跳后台。

鉴权仍是原型头 `x-vs-user`，**不是**生产 IdP。上线后换成员工 SSO / 组。

## 能做什么

| 区 | 行为 |
|---|---|
| Dashboard | 窗口内营收 / 单数 / AOV / 访客 / 转化率 / 顾客数 / 在线；工作队列（待付、未履约、拒付过期、风控）；按日营收与访客柱图；漏斗（会话 → 购物车 → 结账 → 下单 → 已付）；Top SKU；省份；最近订单；Attention 列表（未决尝试、高危、hold、未履约、缺 env、未收集流量）；health |
| Orders | 列表多一列配送 / 渠道 / 件数。详情：6 个 KPI（合计、支付、配送、履约、风控分、发票）、行明细 + 金额拆解（小计 / 促销 / 运费 / 各税行 / 合计）、客户与地址表单、**时间线**（创建、同意记录、每次刷卡、重开、POS 推送、已付、**ERP 推送成功 / 失败**、开票、邮件成功 / 失败、hold、备注、认领）、支付 / 尝试 / POS、**ERP 面板**（`Order/syncEspoQuote` 状态、失败原因、员工重推）、风控 hold + 一键拉黑该邮箱、履约、邮件（含已发记录）、内部备注、Record（账号、locale、IP、consents、opened、状态链接）。待付款、拒付、过期可改行并重计价（拒付 / 过期会重开成待付款）；取消（不退款）；重开；克隆成新待付款单（已付发票不动）；复制查单链接；发票 PDF |
| Payments | 窗口（今日 / 7 天 / 全部）：成交额、通过率、拒付、3DS、未决、高危 KPI；按日已付 vs 拒付柱图；HT vs POS、卡组、拒付码、last4 聚类、未决尝试、高风险单。**不存 PAN** |
| Traffic | 第一方埋点 + 服务端日志（见下）。KPI：访客 / 会话 / PV / 转化 / **归因营收**（付款事件带 `orderNo`，营收算回会话来源）/ 在线 / 爬虫命中 / 404。**获客渠道卡片**：自然搜索、付费、社交、AI 助手、邮件、外链、直达，各自会话占比、已付单数与金额。按日会话堆叠柱（按渠道）；漏斗。**平台表**（每个入口：Google / Bing / DuckDuckGo / Yahoo / Baidu、Facebook / Instagram / TikTok / Pinterest / YouTube / LinkedIn / X / Reddit / Threads / WeChat / 小红书、ChatGPT / Perplexity / Copilot / Gemini / Claude、Google Ads / Meta / Microsoft / TikTok 广告点击 id、其它站）：会话、访客、跳出、进购物车、到结账、已付、营收、转化率。落地页表（同一组指标）；Campaign 表（utm_source / medium / campaign）；付费点击 id；utm_term；referrer 原域；页面路径；设备 / 浏览器；受众；语言；**Core Web Vitals**（每页 p75 LCP / INP / CLS / FCP / TTFB，按 Google 阈值着色）；事件；在线页面 |
| SEO | KPI：站点分（页面审计均分 − 抓取项）、错误 / 警告数、可索引页数、robots / sitemap 是否存在、自然搜索会话与营收、爬虫命中、404、Search Console 点击 / 展示 / CTR / 平均排名。**待修问题**表（错误优先，点行进页面审计）；**抓取性**（robots.txt disallow 规则、是否引用 sitemap；sitemap URL 数与样例；缺失即报错并给推荐写法）；**页面审计**（逐个店面 HTML：分数、title / description 长度、H1 数、字数、无 alt 图、入链数、canonical、Open Graph、JSON-LD 类型、错误 / 警告数；点进看全部 head 标签与问题清单）；**搜索引擎爬虫**（Googlebot / Bingbot / Applebot / GPTBot / OAI-SearchBot / PerplexityBot / ClaudeBot / Bytespider / Ahrefs / Semrush… 命中与最后一次时间，服务端记录，不依赖 JS）；**自然搜索**（按引擎、按日）；**404 监控**（路径、次数、bot 占比、referrer、最后一次）；**Core Web Vitals p75**；**Google Search Console**：粘贴 Performance CSV 导出（Queries / Pages），保留最近 12 次并与上一次比较（点击 / 排名 delta）；Top 查询、Top 页面、**关键词观察表**（自填目标词 + 目标页，排名 / 点击 / 展示自动从导入填入）、**Striking distance**（排名 5–20 且展示 ≥ 20）、Top 10 低 CTR 提示 |
| Reports | 销售报表（全部由订单快照聚合，不重算）：营收、AOV、商品额、运费、税、顾客新 / 老、创建→已付比例、付款中位时长；按日营收、按日创建 vs 已付；Top SKU（件数 / 单数 / 营收 / 占比，点进 SKU）；省份、经销商、配送方式、渠道、游客 / 账号、卡组、促销码、状态、履约分布；待付款账龄表 |
| Risk | 评分队列（金额、地址不一致、尝试风暴、邮箱 / IP 频次、last4 复用、无 3DS 高票）；履约拦截（hold）与邮箱拉黑（结账 403 `email_blocked`）。Hold **不**记已付 |
| Customers | 列表：类型、已付 / 全部、终身金额、AOV、省、最近下单。详情：终身金额 / AOV / 首末单 / 省 / 未决问题 KPI；订单表；最常买 SKU；改显示名 / 电话 / **Espo User id** / 支持备注（`data/customer-crm.json`）；拉黑 / 解黑（顶部横幅显示当前拉黑状态） |
| Products | 列表带覆盖前价格。详情：现价 / 已售件数 / 营收 KPI（来自 Reports 全部窗口）、改名、规格、分类、价、图、下架；恢复快照价；查看含该 SKU 的订单；新增本包结账 SKU。写入 `data/catalogue-overrides.json`。**结账立即用新价 / 新名**。店面列表在主站，不在本包 |
| Dealers | 表格视图（代码、省、联系、状态、已付 / 全部、金额）。详情：经该店已付、占经销商总额比例、邀请码、服务 KPI；改门店资料、邀请码、服务、**Espo Account / User id**、停用；新增经销商。写入 `data/dealers.json`。结账 `GET /api/dealers` 读这份目录（不含邀请码、不含 Espo id） |
| System | 支付模式 / 邮件 / POS / 进程 uptime 与内存 / 磁盘上的订单与流量文件数；哪些 env **键**已设（不回值）；数据文件清单；鉴权说明 |

## 流量埋点（Traffic / SEO）

- 所有店面页（index、cart、checkout、order-status、login、register、forgot-password、account）在 `session.js` 之后加载 `assets/analytics.js`。每次加载发一条 `pageview`；`cart.html` 加购发 `add_to_cart`，`checkout.html` 创建订单发 `order_created { orderNo }`、付款成功发 `purchase { orderNo }`（后台据此把营收归因到会话来源）；离开页面时发一次 `vitals`（LCP / INP / CLS / FCP / TTFB，PerformanceObserver 采集）。可用 `VSTrack.event(name, data)` 再加。
- 渠道 / 平台判定（`lib/traffic.ts classify`）：广告点击 id（gclid / msclkid / fbclid / ttclid / li_fat_id / twclid）或 `utm_medium=cpc|paid…` → 付费；`utm_medium=email|newsletter|sms` → 邮件；否则按 referrer 域匹配平台表（搜索引擎 → 自然搜索、社交平台 → 社交、ChatGPT / Perplexity / Copilot / Gemini / Claude → AI 助手、其它 → 外链）；无 referrer → 直达。`utm_source` 存在时平台名以它为准。每个会话按**第一条** pageview 归因。
- 服务端日志（`scripts/dev-server.mts logHit`）：任何 HTML 页命中若 UA 是已知爬虫（Googlebot、Bingbot、Applebot、GPTBot、OAI-SearchBot、PerplexityBot、ClaudeBot、Bytespider、Ahrefs、Semrush、Lighthouse、headless…）记一条 `crawl`；任何非静态资源的 404 记一条 `notfound`（含 referrer 域）。这两类不进人类访客统计，用于 SEO 页。生产环境若前面有 CDN / 反向代理，请把访问日志接到同一形状。
- 发送到 `POST /api/track`（公开，按 IP 限速 240/分钟，body 经 zod 校验，`204`）。**staff 会话不发**。
- 只存：时间、类型 / 事件名、路径、页面键、referrer 域（同站记 `internal`、无 referrer 记 `direct`）、UTM（source / medium / campaign；落地页的 UTM 记进 sessionStorage 供后续页归因）、`vid`（浏览器 localStorage 随机 id）、`sid`（sessionStorage，30 分钟无活动换新）、角色（游客 / 顾客 / 经销商，来自会话头）、设备 / 浏览器（UA 粗分，bot 过滤）、语言、`ipHash`（sha256(LINK_SECRET + ip) 前 16 位）。**不存邮箱、不存原始 IP、不存卡信息。**
- 落盘：`data/traffic/YYYY-MM-DD.jsonl`（UTC 文件名，聚合按 Winnipeg 日）。`GET /api/admin/traffic?window=today|7d|30d` 现读现算。漏斗里“下单 / 已付”来自 `data/orders` 同窗口；当已付数超过会话数（种子数据、埋点晚于订单）转化率回 `null`，页面显示“需要流量”。
- 上线：`TRAFFIC_DIR` 可改目录；多实例时把 append 换成写队列 / 仓库，`summarizeTraffic` 的返回形状不变，`admin.html` 不用改。

## API

全部 `/api/admin/*` 要求 `role=staff`。

| 方法 | 路径 |
|---|---|
| GET | `/api/admin/summary` |
| GET | `/api/admin/orders` · `?q=&status=&fulfillment=&guest=0\|1&channel=&dealer=&risk=high\|review\|hold` |
| POST | `/api/admin/orders` `{ cloneFrom }` → 新的 `pending_payment` 副本 |
| GET / PATCH | `/api/admin/orders/:orderNo` body 见下（含 `erpPush:true` 重推 ERP） |
| POST | `/api/admin/orders/:orderNo/resend` `{ email?, kind: confirmation\|invoice }` |
| GET | `/api/admin/payments` · `?window=today\|7d\|all` |
| GET / POST | `/api/admin/risk` POST `{ action: hold\|release\|block_email\|unblock_email, orderNo?, email?, reason? }` |
| GET | `/api/admin/traffic` · `?window=today\|7d\|30d` → totals / live / funnel / daily（含按渠道）/ hourly（今日）/ channels / platforms / landing / referrers / campaigns / terms / clicks / pages / paths / devices / browsers / languages / roles / events / vitals / crawlers / notFound |
| GET / POST | `/api/admin/seo` · `?window=today\|7d\|30d` → health / pages（逐页审计）/ crawlability / crawlers / notFound / vitals / organic / search（GSC 导入汇总）。POST `{ action: add_keyword\|remove_keyword\|import_gsc\|remove_import, term?, targetPath?, id?, csv?, label? }`，写 `data/seo.json` |
| GET | `/api/admin/reports` · `?window=today\|7d\|30d\|all` → totals / daily / topSkus / provinces / dealers / delivery / channel / account / promos / brands / status / fulfillment / pendingAging |
| POST | `/api/track` **公开**埋点 `{ type: pageview\|event, name?, path, ref?, utm{source,medium,campaign,term,content}?, click?, vid, sid, lang?, data? }` → 204 |
| GET | `/api/admin/customers` · `?q=` |
| GET / PATCH | `/api/admin/customers/:email` `{ name?, phone?, note? }` |
| GET / POST | `/api/admin/products` POST `{ sku, name, unitCents, variant?, category?, img? }` |
| PATCH | `/api/admin/products/:sku` `{ unitCents?, name?, variant?, category?, img?, disabled?, revert? }` |
| GET / POST | `/api/admin/dealers` |
| PATCH | `/api/admin/dealers/:id` |
| GET | `/api/admin/ops` → health / bind / keys / process（node、uptime、rss）/ data（orders、traffic 文件数与字节） |
| GET | `/api/dealers` 公开目录（无邀请码，结账用） |

员工也可凭会话读 `GET /api/orders/:orderNo` 与发票 PDF（`orderAccess` 认 staff）。

### 改订单 PATCH body

任意子集：`status:"cancelled"` · `reopen:true` / `status:"pending_payment"` · `riskHold` + `riskReason` · `fulfillment` · `note` · `email` · `phone` · `firstName` · `notes`（给顾客看的配送备注）· `deliveryMethod` · `dealerId`（`null` = 直营，仅当该省没有经销商）· `shipping` · `billing` · `items:[{sku,qty}]` · `erpPush:true`（已付单重推 ERP，失败不改支付状态）。

改行 / 改省 / 改配送会重计价，允许状态：`pending_payment` / `declined` / `expired`（后两者会重开，TTL 从 `openedAt` 重新算：HT 30 分钟，POS 7 天）。已付单的金额与发票快照不改——要改内容就 **Clone**。后台**不能**把未付款标成已付，也没有真退款。

风控 hold 后，履约改成 `processing` / `in_transit` / `delivered` 会 409 `fulfillment_on_hold`。拉黑邮箱后 `POST /api/orders` 回 403 `email_blocked`。评分只看订单上已有事实（拒付码、last4、邮箱、IP），**不读卡号**。

## ERP 推送（付款成功）

不新开后台栏目。挂在 `notifyPaidOrder`：HT（`POST /api/checkout/moneris/pay`）和 POS / Go（`push-pos` + `go/postback`）两条通道在 `markPaid` 之后都走这里。与邮件并行，`Promise.allSettled`，ERP 失败**不回滚付款**。

契约对齐 Desktop/CRM 的 `CQuote::postActionPushToErp`：`POST {ERP_BASE_URL}/Order/syncEspoQuote`，头 `token` + `server: 1`，业务成功 `code === 1`。payload 字段名与 CRM `buildPayload` 相同（金额从分转成 CAD 元）。**同一套 Espo id**：`source` 为 `EspoCRM`；`userId` 是 Espo User（HT 看顾客档案，POS 看经销商 User）；`accountId` 是经销商的 Espo Account。店面 `usr_*` / `MB-YUAN` **不发送**。未填则发 `null`。另带 `storefront` 块（通道、发票号、授权码、经销商 code）。未配 `ERP_BASE_URL` / `ERP_TOKEN` 时记 `skipped`，本地 mock 不挡结账。订单页可重推；Dashboard Attention 列出推送失败的已付单。

## 履约 vs 支付状态

支付状态仍是订单生命周期（`pending_payment` / `paid` / …）。履约是另字段：`unfulfilled` → `processing` → `in_transit` → `delivered` / `returned`。只有已付或已取消的单能改履约。取消**不走退款**。

## 不做（本版）

- 真退款 / 部分退 / 标已付
- 把 SKU 推到 vanstro.ca 主站列表
- 员工账号库、审计日志落库（改单会追加一条内部备注）
- 多实例共享 `data/` 文件
