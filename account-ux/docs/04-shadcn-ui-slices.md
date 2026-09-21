# 04 · shadcn/ui 组件切片（UI Slices）

> 前端使用 **shadcn/ui**（Radix primitives + Tailwind + cva）。本文件把三条流程（登录 / 忘记密码 / 个人中心）中出现的**每一个界面元素**切成可复用组件，标注对应的 shadcn 组件、需要新增的 variant、状态与 props，作为开发落地前的组件清单。
>
> 可视化切片页：[`components.html`](../components.html) · 主题变量：[`shadcn/globals.css`](../shadcn/globals.css) · 自定义组件源码：[`shadcn/components/`](../shadcn/components/) · 校验规则：[`shadcn/lib/validators.ts`](../shadcn/lib/validators.ts)

## 0. 切片原则

1. **能用 shadcn 原件就不自造**。只在 shadcn 没有对应物、或组合逻辑跨多个原件时才新建 `components/account/*` 业务组件。
2. **样式只走 token**。所有颜色 / 圆角 / 阴影引用 `globals.css` 中的语义变量（`bg-primary`、`text-muted-foreground`）或品牌扩展（`bg-brand-navy-900`），禁止在组件里写 hex。
3. **状态用 data 属性**，与 Radix 保持一致：`data-state="error|success"`、`data-loading`、`aria-invalid`，方便 Tailwind `data-[state=error]:` 选择器。
4. **一种控件一种高度**：Input / Select / Button 默认 `h-control`（46px）；`sm` 尺寸 36px 只用于卡片内行内操作。
5. **文案不进组件**。所有用户可见文案通过 props 或 i18n key 传入（EN / FR）。

## 1. 主题 token 映射（VI → shadcn）

先说一个陷阱：shadcn 的 `--accent` **不是**「品牌强调色」，它是 hover / active 的中性底色，被 Button ghost、Select 选项、Dropdown 条目、Sidebar 悬停等几十处引用。把暖阳橙或青翠绿塞进去，全站悬停态都会变色。品牌高光色必须作为独立自定义变量存在，不占任何 shadcn 语义槽。

| shadcn 变量 | Light | Dark | 来源与用途 |
|---|---|---|---|
| `--background` / `--page` | `#f1f4f3` | `#061412` | 页面底，豆绿灰色相延伸 |
| `--foreground` | `#0a1614` | `#e6edea` | 正文墨色 |
| `--card` / `--popover` | `#ffffff` | `#0e1f1c` | 卡面与浮层同值 |
| `--primary` | `#004744` | `#4aa8a2` | 深藏青：主按钮、链接、选中导航、进度。深色底取提亮版满足 4.5:1 |
| `--primary-foreground` | `#ffffff` | `#031412` | 白皮书「深色底优先反白稿」 |
| `--secondary` / `--muted` / `--accent` | `#e9edeb` | `#162a26` | 次级填充、静默区、**hover 底色，保持中性** |
| `--muted-foreground` | `#6d7c79` | `#7b8d89` | 辅助文字、hint |
| `--destructive` | `#b3261e` | `#f0736a` | VI 未定义，例外登记（docs/00 §1.3） |
| `--border` | `#d2dad8` | `#233834` | 分隔线、卡片描边 |
| `--input` | `#b9c3c0` | `#37514b` | 输入框描边，比分隔线重 |
| `--ring` | `#004744` | `#4aa8a2` | 焦点环取主色：`focus-visible:ring-[3px] ring-ring/30` |
| `--sidebar-accent` | `#e0ebe9` | `#0b2a28` | 账户左菜单选中项用 brand-soft 而非 muted |
| `--radius` | `0.5rem` | | Input / Button 8px；Card 12px；Dialog 16px |
| `--font-sans` / `--font-mono` | HarmonyOS Sans / IBM Plex Mono | | 标题 700，正文 400 / 500；等宽用于错误码、验证码、脱敏号码 |

**品牌自定义变量 · 不进 shadcn 语义槽**（已在 `@theme inline` 注册，可直接用 `bg-success-soft`、`text-warning`）：

| 变量 | 值 | 只允许用在 |
|---|---|---|
| `--success` / `--success-soft` | `#0d8968` / `#deefe9` | 成功 Alert、密码规则通过、`Delivered` 徽章、Switch on 之外的一切「成功」 |
| `--warning` / `--warning-soft` | `#8a5a0b` / `#fdefdb` | 警告 Alert 文字与图标、限流提示、`In review` 角标、Caps Lock |
| `--brand-highlight` | `#f5a93f` | 暖阳橙原值：会员等级 Badge 底、密码强度中档条、装饰图形。禁止用于按钮、大面积填充与任何文字 |
| `--brand-highlight-ink` | `#8a5a0b` | 需要橙色文字或细线时的替代值 |
| `--brand-navy-900` | `#021816` | 登录页品牌区、Toast、保存条（反白 Logo） |
| `--brand-grey` | `#9ba8a2` | placeholder 原值 |

Alert 只内置 `default` / `destructive`，需在 `components/ui/alert.tsx` 的 cva 中加 `success` / `warning` 两个 variant 指向上述变量（写法见 `globals.css` 尾注）。

## 2. 组件清单（原件层 `components/ui/*`）

`npx shadcn@latest add` 需要安装的组件；★ 表示需在默认基础上**新增 variant / size**。

| # | shadcn 组件 | 使用位置 | 需新增 / 调整 |
|---|---|---|---|
| 1 | `button` ★ | 全部 | variant：`google`、`apple`、`accent`、`danger-outline`；size：`control`(46px) 默认、`sm`(36px)、`icon`；`loading` prop（spinner 替换文字、`aria-busy`） |
| 2 | `input` ★ | 全部表单 | 高度 `h-control`；`aria-invalid` → `border-destructive`；配合 `InputAddon`（前缀图标 / `+1` / 后缀按钮） |
| 3 | `label` | 全部 | 右侧可选说明 `<Label hint="optional">` → `text-muted-foreground font-normal` |
| 4 | `form` (react-hook-form + zod) | 登录 / 忘记密码 / Profile / 改密 / 地址 / 银行卡 | `FormMessage` 前置 14px alert 图标；`FormDescription` 作为 hint |
| 5 | `checkbox` | Remember me · CASL 同意 · 登出其他设备 · 默认地址 | 选中态 `bg-primary` |
| 6 | `switch` | 营销邮件 · 两步验证 | on = `bg-primary`（选中态是主色，不是成功色） |
| 7 | `select` | 语言 · 性别 · 省份 · 账单地址 | 高度 `h-control`；省份 option value 为两字母代码 |
| 8 | `radio-group` ★ | 忘记密码渠道（Email / SMS）| 新增 **卡片式** variant `segmented`：等宽、图标 + 文案、选中 `border-primary bg-secondary` |
| 9 | `input-otp` | 6 位验证码 | 6 slots，`pattern={REGEXP_ONLY_DIGITS}`，错误态 slot 变 `border-destructive`，支持粘贴 |
| 10 | `dialog` | 首次社交登录补全 · 修改邮箱/手机 · 头像裁剪 · 地址 · 银行卡 | 圆角 `rounded-xl`，Footer `bg-muted`；宽度 440 / 460 / 560 / 680 |
| 11 | `alert-dialog` | 删除账号 · 删除地址 · 删除卡 | 确认按钮 `variant="danger-outline"`；删除账号需输入 `DELETE` 才启用 |
| 12 | `alert` ★ | 登录错误 · 锁定 · 未验证 · 改密结果 · 银行拒绝 | variant：`error`、`warning`、`success`、`info`（默认 shadcn 仅 default/destructive） |
| 13 | `badge` ★ | 标识符类型 · Verified · Not verified · Default · Expired | variant：`navy`、`green`、`orange`、`error`；`uppercase tracking-wide text-[11px]` |
| 14 | `sonner` (toast) | 保存成功 · 验证码已发送 · 设备已登出 | 深色 `bg-brand-navy-900`，右下角，成功用绿勾、错误用红叉 |
| 15 | `card` | 所有内容分区 | `rounded-lg shadow-sm`；`CardHeader` 22px 内边距；危险区 `border-destructive/30` |
| 16 | `separator` | 卡片内行分隔 · 侧栏 Sign out 前 | `bg-brand-grey-100` |
| 17 | `avatar` ★ | 顶栏 · 侧栏 · Profile | size：`sm`(34) `md`(44) `xl`(104)；fallback 首字母 `bg-primary text-white` |
| 18 | `progress` | 资料完善度 · 登录成功跳转 · 密码强度（4 段） | 用 `transform: scaleX` 而非 width 过渡 |
| 19 | `breadcrumb` | 个人中心 | `text-muted-foreground text-[13px]` |
| 20 | `tabs` / `toggle-group` | EN / FR 切换 | 用 `toggle-group` 单选，深色 pill 选中态 |
| 21 | `tooltip` | CVV `?` · 强度说明 | — |
| 22 | `command` + `popover` | 街道地址联想（Canada Post AddressComplete） | 异步 items；选中后回填 city / province / postal |
| 23 | `skeleton` | 地址 / 卡列表加载 | — |
| 24 | `sidebar` 或自定义 `<AccountNav>` | 个人中心左栏 | 选中 `bg-secondary text-primary`；Sign out `text-destructive` |
| 25 | `dropdown-menu` | 顶栏头像菜单 | — |

## 3. 业务组件（`components/account/*`，自定义切片）

| 组件 | 组成 | props | 状态 |
|---|---|---|---|
| `PasswordInput` | `Input` + 后缀 `Button variant=ghost size=icon`（eye / eye-off）| `value onChange autoComplete showStrength? capsLockHint?` | `visible`、Caps Lock 提示（`Alert` 内联小字） |
| `PasswordStrength` | 4 段 `Progress` + 规则 `ul` | `password history?` → rules `[len, breach, history, strong]`（`lib/password.ts`，与 `assets/vi.js` 同算法） | level 0–4 → grey / destructive / orange / success；泄露 / 重用即 level 1 并给 `hint` |
| `IdentifierInput` | `Input` + 右侧 `Badge` | `value onChange` | 实时识别 `email / phone / username`，手机自动 `+1 (xxx) xxx-xxxx` |
| `SocialButtons` | 2 × `Button variant=google|apple` | `onGoogle onApple` | loading；遵守 Google / Apple 品牌规范（不着色、图标+文字） |
| `OtpField` | `InputOTP` + 倒计时 + Resend `Button variant=link` | `length=6 ttl=600 resendAfter=60 onComplete onResend` | idle / verifying / error（剩余次数）/ expired / locked |
| `Stepper` | 3 步 圆点 + 连线 | `steps current` | done（勾）/ current（实心）/ upcoming |
| `MaskedDestination` | 文本 + `Button variant=link`（Change） | `type value` | `g•••n@gmail.com` / `+1 (•••) •••-0142` |
| `AuthShell` | 左品牌区（`bg-brand-navy-900` + 反白 Logo + 辅助图形）+ 右表单区 | `title subtitle children footer` | 登录 / 忘记密码共用；<960px 折叠品牌区 |
| `RedirectOverlay` | 全屏 `Card` + `Progress` + 手动链接 | `name target delay=1800` | 登录成功跳转 |
| `AvatarUploader` | `Avatar xl` + 相机 `Button size=icon` + `Dropzone` | `src onFile maxSize=5MB min=200 accept=[jpeg,png,webp]` | idle / drag-over / error / uploaded（可 Remove） |
| `AvatarCropDialog` | `Dialog` + 圆形裁剪画布 + `Slider`（缩放） | `image onSave(blob 512×512)` | 拖动 / 滚轮缩放 |
| `SaveBar` | sticky 底部 `bg-brand-navy-900` 条 + Discard / Save | `dirty onDiscard onSave saving` | hidden / visible / saving |
| `KeyValueRow` | 3 列 grid：label · value + `Badge` · action | `label value badge action` | Contact & sign-in details |
| `LinkedAccountRow` | provider 图标框 + 名称 / 元信息 + Connect / Disconnect | `provider connected meta onToggle disabled` | 最后一种登录方式不可解绑 → Toast |
| `SessionRow` | 设备图标 + 名称 + 位置 / IP（`font-mono`）/ 时间 + Sign out | `device location ip lastActive current trusted onSignOut` | current 绿点 + `This device`；trusted → `Badge` “Trusted · 30 days”；非当前 IP 后两段脱敏 |
| `CaptchaField` | 文字图（`<img>` 或 canvas）+ `Input` + 音频 / 刷新 `Button size=icon` | `challengeId onChange onRefresh onAudio` | hidden（<3 次失败）/ visible / error |
| `MfaVerifyPanel` | `MaskedDestination` + `OtpField` + `Checkbox`（Trust 30 days）| `challenge onVerify onResend` | verifying / error / expired |
| `ConsentCheckbox` | `Checkbox` + 长文案 + `Badge`（required / CASL express） | `id label badge required error` | 注册页 Terms / Marketing；勾选框描红 |
| `EmailSentPanel` | 信封环 + 掩码地址 + Resend 倒计时 + 切换渠道链接 | `to ttl resendAfter onResend onSwitch` | 忘记密码 2a · 注册验证邮箱共用 |
| `TokenCountdown` | 卡头右侧 `mm:ss` | `expiresAt onExpire` | 重置令牌 15 分钟 |
| `FreezeAccountCard` | `Alert warning` 薄封装 + 链接 | `maskedEmail href` | 忘记密码 Step 4 |
| `WelcomeOfferCard` | `Card` + 优惠码 + Copy | `code expires marketingOptIn` | 未同意营销时只显示 “Start shopping” |
| `OrdersTable` | `Table` + 筛选胶囊 + `Badge` 状态 + tabular 金额 | `orders filter onFilter locale` | all / transit / delivered / returns；≤ 960px 隐藏 Ship to |
| `QuotesTable` | 同 `OrdersTable` 结构 | `quotes` | awaiting（orange）/ expired |
| `RecentOrdersList` | 3 行 grid（订单号 · 状态 · 金额） | `orders` | Overview |
| `TierBadge` | `Badge variant=orange` + 菱形 `clip-path` | `tier points` | 橙做标签底色的唯一位置 |
| `TaxHint` | 行内 `Badge`（“Taxes at checkout: GST 5% + RST 7%”） | `province` → `lib/tax.ts` | Overview Default address |
| `ExplainGrid` | 2 列说明块（`bg-muted` 卡） | `items=[{title, body}]` | 密码卡 / 设备卡底部；≤ 960px 单列 |
| `ReviewBadge` | `Badge variant=orange` “In review” + 人工复核链接 | `state=review|approved|rejected` | 头像 / 昵称审核（Law 25 §12.1） |
| `DangerZone` | `Card` 红描边 + 说明 + `Button variant=danger-outline` | `title description action` | 删除账号 |
| `AddressCard` | `Card` + 芯片 + `<address>` + 备注 + 操作行 | `address isDefaultShipping isDefaultBilling onEdit onRemove onSetDefault` | default（`border-primary ring-1`）/ normal |
| `AddressFormDialog` | `Dialog` + `Form`（11 字段） | `address? addresses onSave` | 新增 / 编辑；邮编 FSA 与省份交叉校验；PO Box 拦截 |
| `PostalCodeInput` | `Input` 自动大写 + 补空格 | `value province onChange` | 校验通过显示 ✓ “Looks good” |
| `PhoneInput` | `Input` + 前缀 `+1` | `value onChange` | 10 位自动格式 |
| `CardBrandBadge` | 48×32 品牌标 | `brand=visa|mastercard|amex|unknown size=md|sm` | 品牌色不可改（Visa 蓝斜体 / MC 双圆 / Amex 蓝底） |
| `PaymentMethodRow` | `CardBrandBadge` + 名称 + 芯片 + 次行 + 操作 | `card isDefault expiry onEdit onRemove onSetDefault` | default / expiring-soon（≤90 天）/ expired（文字变 muted，无 Set default） |
| `CardFormDialog` | `Dialog` + `Form`（卡号 / 姓名 / 到期 / CVV / 账单地址 / 默认） | `card? addresses onSave` | 新增（含品牌识别 + Luhn）/ 编辑（卡号只读 `MaskedCard`）/ declined（顶部 `Alert error`） |
| `CardNumberInput` | `Input` 分组格式 + 右侧 `CardBrandBadge sm` | `value onChange onBrand` | 输满并 Luhn 通过 → success 并聚焦到期日 |
| `EmptyState` | 圆形图标底 + 标题 + 说明 + 按钮 | `icon title description action` | 地址簿 / 卡列表为空 |
| `ConfirmRemoveDialog` | `AlertDialog` 薄封装 | `title body confirmLabel onConfirm` | 地址 / 卡删除共用 |
| `CheckoutShell` | 精简顶栏（Secure 芯片 + Stepper + EN/FR）+ 两栏（表单 + sticky `OrderSummary`） | `step locale` | shipping / review / payment / done |
| `Stepper` | 3 步，已完成可点回退，未到不可点 | `current maxReached onJump` | active / done / disabled |
| `OrderSummary` | 商品行 + 运费 + `TaxLines` + 合计 + BN + 加密说明卡 | `cart quote province` | HST 单行 / GST+PST / GST+QST（FR） |
| `TaxLines` | 税行列表，label 随省与语言 | `quote locale` | 税率变更时高亮闪烁 |
| `AddressPicker` | 已存地址 radio 卡 + “New address” 表单 | `addresses value onChange` | PO Box / FSA↔省 错误 |
| `DeliveryOptions` | radio 卡：LTL / 白手套 / 自提 | `province value onChange` | 运费随省变化 |
| `ReviewBlock` | 小节 kv + Edit 链接回到对应步 | `contact shipping delivery` | – |
| `ConsentGroup` | 必勾 ×2（Terms / Privacy）+ 可选 CASL + QC `Alert warning` | `province values onChange` | error 摘要 |
| `BillingAddress` | Checkbox 同收货 + 折叠表单 | `sameAsShipping` | AVS |
| `SavedCardPicker` | radio `pay-opt` + `CardBrandBadge` + 内嵌 CVV | `cards value onChange` | 选中 `border-primary`；过期卡禁用 |
| `MonerisHostedFields` | 单行卡号 / 到期 / CVV 的 Hosted Tokenization iframe，Pay 按钮在页面 | `url profileId env locale` · ref `tokenize() reset()` | 生产：HT iframe + postMessage；原型：`VSMoneris.mockMount` |
| `ThreeDSChallenge` | Dialog 内嵌 ACS iframe | `acsUrl onResult` | OTP 通过 / 失败 |
| `PlacingOrder` | 全屏 4 步进度（授权 → receipt → 建单 → 回执） | `stage` | – |
| `OrderConfirmed` | 成功环 + 订单号（Copy）+ 回执渠道状态 + Resend / Print | `order receipt onResend` | email ok / failed / sms |
| `TaxInvoice` | 可打印税票：商品、运费、税行、BN/QST、授权码、卡掩码 | `invoice` | – |
| `DataTransparencyCard` | “存了什么 / 从未接触” 两列 | – | PIPEDA 原则 8 |
| `SiteFooter` | 主站 www.vanstro.ca 页脚：品牌栏（标识 / 橙色 eyebrow / 联络 / 社媒）+ 4 链接栏 + 法务条 | `locale` | 原型见 `assets/site-footer.js`；生产直接复用主站 `footer` 组件，链接与文案以主站 CMS 为准 |

## 4. 页面组合树

```
login.html
└─ AuthShell
   ├─ Breadcrumb-less top bar: link "Create an account" · ToggleGroup(EN/FR)
   ├─ h1 + p
   ├─ Alert(error|warning|info)            ← 登录失败 / 锁定 / 未验证 / 仅社交
   ├─ Form
   │  ├─ FormField IdentifierInput
   │  ├─ FormField PasswordInput(capsLockHint)
   │  ├─ row: Checkbox(Remember me · 30 days) · Button variant=link(Forgot password?)
   │  └─ Button size=control loading
   ├─ Separator("or continue with")
   ├─ SocialButtons
   ├─ p.small legal (PIPEDA)
   ├─ Dialog FinishProfile (首次社交登录：PhoneInput · Checkbox CASL)
   └─ RedirectOverlay

forgot-password.html
└─ AuthShell
   ├─ Stepper(3)
   ├─ Step1: RadioGroup segmented(Email/SMS) · Input|PhoneInput · Button
   ├─ Step2: MaskedDestination · OtpField · Button · Alert(error|warning)
   ├─ Step3: PasswordInput + PasswordStrength · PasswordInput(confirm) · Checkbox(sign out others) · Button
   └─ Step4: success icon · h1 · p · ul ✓ · Button(Continue to sign in (5))

account.html
├─ SiteHeader: Logo · nav links · Input(search) · ToggleGroup(EN/FR) · Button icon(cart) · Avatar sm + DropdownMenu
├─ Breadcrumb
├─ AccountNav (Sidebar): Avatar md + name · nav items · Separator · Sign out
└─ main
   ├─ Overview: 3 × Card tile · Card(Progress + todo rows with Badge)
   ├─ Profile: Card(AvatarUploader) · Card(Form 7 fields) · Card(KeyValueRow ×3 + Switch) · SaveBar · AvatarCropDialog · Dialog(change contact)
   ├─ Security: Card(Form change password + PasswordStrength) · Card(LinkedAccountRow ×2) · Card(Switch 2FA) · Card(SessionRow ×3) · DangerZone · AlertDialog(DELETE)
   ├─ Addresses: page-title + Button(Add) · grid AddressCard ×n | EmptyState · AddressFormDialog · ConfirmRemoveDialog
   └─ Payment: page-title + Button(Add) · Card(PaymentMethodRow ×n | EmptyState) · secure note · CardFormDialog · ConfirmRemoveDialog

checkout.html
├─ CheckoutHeader: logo · Secure checkout 芯片 · Stepper(3) · EN/FR · Back to cart
├─ two-column: <main> + <aside sticky OrderSummary(TaxLines · BN · 加密卡)>
├─ Step1 Shipping: Card(email / mobile) · AddressPicker(saved | new) · DeliveryOptions · privacy notice link
├─ Step2 Review: ReviewBlock ×3 · 预披露（总额 / 送达 / 退货）· ConsentGroup · Button Continue to payment
├─ Step3 Payment: BillingAddress · SavedCardPicker(CVV) | MonerisHostedFields · secure note · Button Pay {total} CAD
├─ PlacingOrder (fullscreen)
└─ Confirmed: OrderConfirmed · TaxInvoice · DataTransparencyCard
   Dialogs: ThreeDSChallenge · SecurityStatement · PrivacyNotice · SessionExpired · ChangeReceiptEmail
```

## 5. 状态矩阵（开发 / QA 对照）

| 组件 | 状态 | 视觉 | 触发 |
|---|---|---|---|
| Input | default / hover / focus / error / success / disabled | 描边 `input` → `brand-grey-300` → `ring-ring` / `destructive` / `success` / `bg-muted` | — |
| Button primary | default / hover / loading / disabled | `bg-primary` → `bg-brand-navy-700` → spinner → `opacity-50` | `loading` prop |
| Alert | error / warning / success / info | error-50 / orange-50 / green-50 / navy-50 底 + 同系描边 | 服务端状态码 401 / 423 / 403 / 200 |
| Badge | navy / green / orange / error | Default · Verified · Not verified / Expires soon · Expired / Locked | 数据 |
| OtpField | idle / error / expired / locked | slot 描边 → 红 + 剩余次数 → 灰 + Resend → 全禁用 | 400 / 410 / 429 |
| AddressCard | default / normal | `border-primary ring-1 ring-primary` | `isDefaultShipping` |
| PaymentMethodRow | default / soon / expired | Badge navy / orange / error；expired 文字 `text-muted-foreground` | `expState(exp)` |
| SaveBar | hidden / visible / saving | `translate-y-5 opacity-0` → 0 / 1 → Save 按钮 loading | 表单 dirty |
| CaptchaField | hidden / visible / error | 出现动画 150ms；错误红描边 + 自动换图 | 401 ×3 |
| MfaVerifyPanel | verifying / error / expired | OtpField 各态 + Trust 勾选 | `mfa_required` |
| OrdersTable | all / filtered / empty | 行 hover `bg-muted`；空态 `EmptyState` | 筛选 |
| ReviewBadge | review / approved / rejected | orange → green → destructive + 复核链接 | 审核回调 |

## 6. 校验规则（zod，见 `shadcn/lib/validators.ts`）

- `identifier`：email `z.string().email()` ｜ phone `^\+?1?[2-9]\d{9}$` ｜ username `^[a-z0-9_.]{3,30}$`
- `password`：`z.string().min(12)`（或 ≥ 8 且三类字符，兼容旧账号）· `.refine(notBreached)`（服务端 HIBP k-anonymity）· `.refine(notInHistory)`（最近 3 次哈希）；**无符号 / 大小写规则**；不得与当前密码相同（服务端）
- `acceptTerms`：`z.literal(true, { errorMap: () => ({ message: t('REG_001') }) })`
- `captcha`：`z.string().min(1)`，仅在 `captchaRequired` 时启用（`schema.superRefine`）
- `redirect`：`z.string().regex(/^\/(account|checkout|orders|quotes|cart)(\/|\?|$)/)`，失败 `.catch('/account')`
- `otp`：`^\d{6}$`
- `displayName`：`^[\p{L}\p{N} ._'-]{2,20}$`
- `birthday`：≥ 16 岁且 ≤ 120 岁
- `postalCode`：`^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$` + FSA 首字母 ↔ 省份
- `street`：非空且不匹配 `/\bP\.?O\.?\s*BOX\b/i`
- `phoneCA`：`^[2-9]\d{9}$`
- `cardNumber`：品牌识别 + Luhn；`expiry`：`MM/YY` 未过期；`cvc`：3 位（Amex 4 位）
- `quoteTax(province, taxableCents)`：见 `lib/tax.ts`，按送达省返回 HST 或 GST±PST/QST 行（分）

### zod i18n

错误文案不写在 schema 内；用 `z.setErrorMap` 按 `lang` 查 `06-error-codes.md` 的 code：

```ts
z.setErrorMap((issue, ctx) => ({ message: t(issue.params?.code ?? 'SYS_VALIDATION', lang) }));
schema.refine(v => ok(v), { params: { code: 'PWD_003' } });
```

Server 端返回 `{ error: 'PWD_003' }`，前端查同一张表渲染，保证 EN / FR 与文档一致。

## 7. 安装与目录

```bash
npx shadcn@latest init            # style: new-york · base color: neutral · css variables: yes
npx shadcn@latest add button input label form checkbox switch select radio-group input-otp \
  dialog alert-dialog alert badge sonner card separator avatar progress breadcrumb \
  toggle-group tooltip command popover skeleton sidebar dropdown-menu slider
```

```
app/globals.css                     ← 复制 shadcn/globals.css
components/ui/*                     ← shadcn 生成；button / alert / badge / avatar / radio-group 按 §2 ★ 扩展 variant
components/account/*                ← §3 业务组件
lib/validators.ts                   ← §6 zod schema
lib/tax.ts                          ← GST/HST/PST/QST quote（分）
lib/moneris.ts                      ← Checkout preload / receipt（server only）
lib/checkout.ts                     ← 结账 zod schema · quoteCheckout · Moneris 拒绝码文案
components/checkout/*               ← CheckoutStepper · TaxLines · ConsentGroup · SavedCardPicker · MonerisHostedFields
app/api/checkout/quote/route.ts     ← POST 税费报价
app/api/orders/route.ts             ← POST 建单 + 服务端重算税 + Moneris preload + 同意时间戳
app/api/checkout/moneris/pay/route.ts            ← POST 服务端 /payments 为准 · 发回执
app/api/checkout/payment-config/route.ts         ← GET  HT profile / mock 模式
app/api/orders/[orderNo]/receipt/resend/route.ts ← POST 重发回执（限流）
```
