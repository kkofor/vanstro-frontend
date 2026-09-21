# 06 · 错误码与文案对照（EN / FR）

覆盖登录、忘记密码、个人中心、结算 / Moneris 五个域。前后端共用同一套 `code`；前端按 `code` 查表取当前语言文案，不直接展示服务端字符串。

## 0. 约定

- **格式** `DOMAIN_NNN`：`AUTH` 登录 · `OTP` 验证码 · `ME` 个人中心 · `ADDR` 地址 · `PAY` 支付 · `TAX` 计税 · `CONSENT` 同意 · `SYS` 系统。
- **响应体**
  ```json
  { "error": { "code": "AUTH_401", "field": "password", "retryAfter": 900, "meta": { "attemptsLeft": 3 } } }
  ```
  `field` 有值 → 字段级红字并把焦点移到该字段；无值 → 页面顶部 Alert。`meta` 只放插值变量，文案由前端拼。
- **语气**：说发生了什么、钱有没有扣、下一步做什么。不出现 "Oops"、不用感叹号、不指责用户（"Enter…" 而不是 "You forgot…"）。
- **防枚举**：`AUTH_401`、`OTP_404` 对「账号不存在」与「密码错误」返回同一码同一文案。
- **法文**：加拿大法语，标点前留不换行空格（`Refusée : …`、`Réessayez ?`）。金额 `1 234,56 $`，省份缩写不翻译。
- **颜色**：错误 `--vs-error #B3261E`；警告（限流、倒计时、Caps Lock）用 `--vs-warning #8A5A0B`，不是红；信息（社交账号引导）用 `--vs-navy-50` 底。

## 1. AUTH · 登录

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| AUTH_001 | – | identifier | Enter your email, mobile number or username. | Entrez votre courriel, numéro de mobile ou nom d’utilisateur. | 字段 |
| AUTH_002 | – | identifier | Enter a valid email address. | Entrez une adresse courriel valide. | 字段 |
| AUTH_003 | – | identifier | Enter a 10-digit Canadian mobile number. | Entrez un numéro de mobile canadien à 10 chiffres. | 字段 |
| AUTH_004 | – | password | Enter your password. | Entrez votre mot de passe. | 字段 |
| AUTH_401 | 401 | – | **Incorrect email/mobile or password.** Check your details and try again. {n} attempts left before a 15-minute lock | **Courriel/mobile ou mot de passe incorrect.** Vérifiez vos informations et réessayez. {n} tentatives restantes avant un verrouillage de 15 minutes | Alert error；`n ≤ 3` 才显示计数；清空密码框 |
| AUTH_423 | 423 | – | **Too many attempts — account temporarily locked.** Try again in {mm:ss}, reset your password, or continue with Google / Apple. | **Trop de tentatives — compte temporairement verrouillé.** Réessayez dans {mm:ss}, réinitialisez votre mot de passe ou continuez avec Google / Apple. | Alert warning + 倒计时；禁用 Sign in |
| AUTH_403 | 403 | – | **Verify your email first.** We sent a link to {email}. Resend link · Change email | **Vérifiez d’abord votre courriel.** Nous avons envoyé un lien à {email}. Renvoyer le lien · Changer de courriel | Alert warning |
| AUTH_409 | 409 | – | **This email is registered via Google.** Continue with Google, or set a password to sign in this way. | **Ce courriel est associé à un compte Google.** Continuez avec Google ou définissez un mot de passe. | Alert info |
| AUTH_429 | 429 | – | Too many sign-in attempts from this device. Try again in {min} minutes. | Trop de tentatives depuis cet appareil. Réessayez dans {min} minutes. | Alert warning（IP 级限流，不计入账号锁定） |
| AUTH_SOC_CANCEL | – | – | Sign-in was cancelled. You can try again or use your password. | Connexion annulée. Réessayez ou utilisez votre mot de passe. | Toast |
| AUTH_SOC_EMAIL | 422 | – | {provider} didn’t share an email address. Allow email access and try again. | {provider} n’a pas partagé d’adresse courriel. Autorisez l’accès au courriel et réessayez. | Alert error |
| AUTH_CAPS | – | password | Caps Lock is on | Verr. maj. activé | 字段下方警告色提示，非错误 |
| AUTH_CAPTCHA_001 | – | captcha | Enter the characters shown. | Entrez les caractères affichés. | 字段；≥ 3 次失败后出现 |
| AUTH_CAPTCHA_401 | 401 | captcha | Those characters didn’t match. Try the new image. | Les caractères ne correspondent pas. Essayez la nouvelle image. | 字段；自动换图 |
| AUTH_REDIRECT_DOWNGRADED | – | – | （无用户文案；静默跳 /account 并记日志） | — | 防 open redirect |

## 1a. REG · 注册

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| REG_001 | – | terms | Please accept the Terms to continue. | Veuillez accepter les Conditions pour continuer. | 字段；勾选框描红 |
| REG_002 | – | firstName / lastName | Enter your name. | Entrez votre nom. | 字段 |
| REG_409 | 409 | email | An account with this email already exists. Sign in instead or reset your password. | Un compte existe déjà avec ce courriel. Connectez-vous ou réinitialisez votre mot de passe. | 字段 + 两个按钮；仅提交后返回 |
| REG_429 | 429 | – | Too many accounts created from this network. Try again in {min} minutes. | Trop de comptes créés depuis ce réseau. Réessayez dans {min} minutes. | Alert warning |
| REG_VERIFY_410 | 410 | – | This verification link has expired. We’ve sent a new one to {masked}. | Ce lien de vérification a expiré. Nous en avons envoyé un nouveau à {masked}. | Alert warning + 自动重发 |
| REG_VERIFY_RESEND_WAIT | – | – | Resend in {s}s | Renvoyer dans {s} s | 按钮文案 |
| REG_APPLE_RELAY | – | – | You’re using Hide My Email. {relay} will receive your order updates. | Vous utilisez Masquer mon courriel. {relay} recevra vos mises à jour de commande. | 信息面板，非错误 |

## 2. RESET · 忘记密码（邮件一次性链接）

忘记密码不再使用短信验证码，只走邮件链接；登录也不做短信 MFA；6 位 OTP 码仅保留给个人中心变更联系方式（第 2b 节）。

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| RESET_001 | – | email | Enter your email address. | Entrez votre adresse courriel. | 字段 |
| RESET_002 | – | email | That email address doesn’t look right. | Cette adresse courriel ne semble pas valide. | 字段 |
| RESET_404 | 202 | – | If that account exists, we’ve sent a reset link to {masked}. | Si ce compte existe, un lien de réinitialisation a été envoyé à {masked}. | 与成功同文案（防枚举） |
| RESET_409 | 409 | – | This account signs in with Google. You can continue with Google instead — or keep going to add a password. | Ce compte utilise Google. Continuez avec Google — ou poursuivez pour ajouter un mot de passe. | Alert info |
| RESET_429 | 429 | – | **Too many links requested.** You can request up to 3 reset links per hour. | **Trop de liens demandés.** Vous pouvez demander jusqu’à 3 liens par heure. | Alert warning |
| RESET_410 | 410 | – | **This link has expired.** Request a new one — your email is still filled in. | **Ce lien a expiré.** Demandez-en un nouveau — votre courriel est déjà rempli. | Alert warning；回 Step 1 |
| RESET_RESEND_WAIT | – | – | Resend in {s}s | Renvoyer dans {s} s | 按钮文案，52 s |

## 2b. OTP · 变更联系方式（个人中心）

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| OTP_001 | – | code | Enter all 6 digits. | Entrez les 6 chiffres. | 字段 |
| OTP_404 | 202 | – | If an account exists for {masked}, we’ve sent a code. | Si un compte existe pour {masked}, un code a été envoyé. | 与成功同文案（防枚举） |
| OTP_409 | 409 | – | This account signs in with Google. You can still add a password: continue to set one. | Ce compte utilise Google. Vous pouvez tout de même ajouter un mot de passe : continuez. | Alert info |
| OTP_429 | 429 | – | **Too many codes requested.** Wait {min} minutes before asking for another. | **Trop de codes demandés.** Attendez {min} minutes avant d’en demander un autre. | Alert warning；限 3 次 / 小时 |
| OTP_401 | 401 | code | Incorrect code. {n} attempts left. | Code incorrect. {n} tentatives restantes. | 字段；清空 6 格 |
| OTP_423 | 423 | – | **Too many incorrect attempts.** This code is no longer valid. Start again to get a new one. | **Trop de tentatives incorrectes.** Ce code n’est plus valide. Recommencez pour en obtenir un nouveau. | Alert error；禁用 Verify |
| OTP_410 | 410 | – | **Code expired.** Codes last 10 minutes. Resend a new one. | **Code expiré.** Les codes sont valides 10 minutes. Renvoyez-en un nouveau. | Alert warning；启用 Resend |
| OTP_RESEND_WAIT | – | – | Resend in {s}s | Renvoyer dans {s} s | 按钮文案，60 s |
| PWD_001 | – | newPassword | Enter a new password. | Entrez un nouveau mot de passe. | 字段 |
| PWD_002 | – | newPassword | Use at least 12 characters — a short phrase works well. | Utilisez au moins 12 caractères — une courte phrase fonctionne bien. | 规则清单 ✓ / ✗ |
| PWD_003 | 422 | newPassword | This password appeared in a data breach. Choose another one. | Ce mot de passe figure dans une fuite de données. Choisissez-en un autre. | 字段（HIBP k-anonymity） |
| PWD_006 | 422 | newPassword | You’ve used this password before. Choose a new one. | Vous avez déjà utilisé ce mot de passe. Choisissez-en un nouveau. | 字段（最近 3 次哈希） |
| PWD_007 | – | newPassword | Add one more word to reach “strong”. | Ajoutez un mot pour atteindre « fort ». | 提示，非错误 |
| PWD_410 | 410 | – | Your reset link has expired. Start again. | Votre lien de réinitialisation a expiré. Recommencez. | Alert warning → Step 1 |
| PWD_FREEZE | 200 | – | Account frozen. All devices were signed out. Contact support to unfreeze. | Compte gelé. Tous les appareils ont été déconnectés. Contactez le soutien pour le dégeler. | 冻结页 |
| PWD_004 | – | confirm | Passwords don’t match. | Les mots de passe ne correspondent pas. | 字段，实时 |
| PWD_005 | 422 | – | Your new password must be different from your current one. | Le nouveau mot de passe doit être différent de l’actuel. | Alert error |
| PWD_401 | 401 | currentPassword | Incorrect current password. Try again or reset by email. | Mot de passe actuel incorrect. Réessayez ou réinitialisez par courriel. | 字段 + 链接 |

## 3. ME · 个人中心

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| ME_001 | – | displayName | Display name must be 2–20 characters. | Le pseudonyme doit contenir de 2 à 20 caractères. | 字段 |
| ME_002 | – | firstName / lastName | Enter your name. | Entrez votre nom. | 字段 |
| ME_003 | – | birthday | You must be at least 16 to use Vanstro. | Vous devez avoir au moins 16 ans pour utiliser Vanstro. | 字段 |
| ME_003b | 422 | birthday | You’ve already changed your date of birth this year. Next change {date}. | Vous avez déjà modifié votre date de naissance cette année. Prochain changement : {date}. | 字段 |
| ME_AVATAR_REVIEW | 202 | – | Photo updated · in review, usually under a minute | Photo mise à jour · en révision, généralement moins d’une minute | 橙墨提示 + `In review` 芯片 |
| ME_AVATAR_REJECTED | 422 | – | We couldn’t approve that photo. Use a picture of yourself or a neutral image. Request a review | Cette photo n’a pas pu être approuvée. Utilisez une photo de vous ou une image neutre. Demander une révision | 字段错误 + 人工复核链接（Law 25） |
| ME_NICK_REVIEW | 422 | displayName | That display name isn’t allowed. Try another. | Ce pseudonyme n’est pas autorisé. Essayez-en un autre. | 字段（EN / FR 词表） |
| ME_409 | 409 | displayName | That display name is taken. | Ce pseudonyme est déjà pris. | 字段 |
| AVATAR_001 | – | – | Unsupported file. Use JPG, PNG or WebP. | Fichier non pris en charge. Utilisez JPG, PNG ou WebP. | 字段级（上传区） |
| AVATAR_002 | – | – | That file is {size} MB — limit 5 MB. | Ce fichier fait {size} Mo — limite de 5 Mo. | 同上 |
| AVATAR_003 | – | – | Image too small. Use at least 200 × 200 px. | Image trop petite. Utilisez au moins 200 × 200 px. | 同上 |
| AVATAR_004 | – | – | We couldn’t read that image. Try another file. | Impossible de lire cette image. Essayez un autre fichier. | 同上 |
| CONTACT_409 | 409 | value | This {email/number} is already used by another account. | Ce {courriel/numéro} est déjà utilisé par un autre compte. | 字段 |
| CONTACT_401 | 401 | password | Enter your password to continue. | Entrez votre mot de passe pour continuer. | 字段 |
| SESSION_404 | 404 | – | That device is already signed out. | Cet appareil est déjà déconnecté. | Toast |
| PROVIDER_LAST | 409 | – | Set a password or connect another provider before disconnecting {provider}. | Définissez un mot de passe ou associez un autre fournisseur avant de dissocier {provider}. | Toast |
| TWOFA_PHONE | 409 | – | Verify your mobile number first. | Vérifiez d’abord votre numéro de mobile. | 开关回弹 + Toast，链到 Profile |
| DELETE_001 | – | confirm | Type DELETE to confirm. | Tapez DELETE pour confirmer. | 字段 |
| DELETE_409 | 409 | – | You have an open order. Deletion can start once it’s delivered or cancelled. | Vous avez une commande en cours. La suppression pourra commencer une fois livrée ou annulée. | Alert warning |

## 4. ADDR · 地址（个人中心与结算共用）

| code | HTTP | field | EN | FR | UI |
|---|---|---|---|---|---|
| ADDR_001 | – | name | Enter the recipient’s full name. | Entrez le nom complet du destinataire. | 字段 |
| ADDR_002 | – | street | Enter a street address with a civic number. | Entrez une adresse avec numéro civique. | 字段 |
| ADDR_003 | – | street | We can’t deliver to a PO Box. Use a street address. | Nous ne livrons pas aux cases postales. Utilisez une adresse civique. | 字段 |
| ADDR_004 | – | city | Enter a city or town. | Entrez une ville. | 字段 |
| ADDR_005 | – | postalCode | Enter a valid postal code (A1A 1A1). | Entrez un code postal valide (A1A 1A1). | 字段；输入时自动大写 + 空格 |
| ADDR_006 | – | postalCode | This postal code doesn’t match {province}. Check the code or change the province. | Ce code postal ne correspond pas à {province}. Vérifiez le code ou changez la province. | 字段（FSA ↔ 省交叉校验） |
| ADDR_007 | – | phone | Enter a 10-digit Canadian number. | Entrez un numéro canadien à 10 chiffres. | 字段 |
| ADDR_422 | 422 | – | We couldn’t verify this address with Canada Post. Use it anyway? | Impossible de vérifier cette adresse auprès de Postes Canada. L’utiliser quand même ? | Alert warning + 两个按钮 |
| ADDR_ZONE | 422 | – | We don’t ship to this area yet. Delivery is available across the 10 provinces; territories by quote. | Nous ne livrons pas encore dans cette région. Livraison offerte dans les 10 provinces ; territoires sur devis. | Alert info |

## 5. PAY / TAX · 结算与 Moneris

前端只认服务端 `POST /api/checkout/moneris/pay` 的结果（Moneris `POST /payments` 的 `paymentStatus`）；Hosted Tokenization 的浏览器 postMessage 只产出临时 token，不代表付款。Moneris `response_code` 000–049 批准，050+ 拒绝；对用户不暴露原始码，映射如下。

| code | Moneris | field | EN | FR | UI |
|---|---|---|---|---|---|
| PAY_FRAME_PAN | – | pan | Enter your card number. | Entrez votre numéro de carte. | iframe 内字段 |
| PAY_FRAME_LUHN | – | pan | Check the card number. | Vérifiez le numéro de carte. | 同上 |
| PAY_FRAME_EXP | – | exp | Enter a valid expiry (MM / YY). | Entrez une date d’expiration valide (MM / AA). | 同上 |
| PAY_FRAME_CVV | – | cvv | Enter the 3-digit code on the back of your card (4 on the front for Amex). | Entrez le code à 3 chiffres au dos de la carte (4 devant pour Amex). | 同上 |
| PAY_FRAME_NAME | – | name | Enter the name as printed on the card. | Entrez le nom tel qu’imprimé sur la carte. | 同上 |
| PAY_050 | 050, 052–075, 077+ | – | **Your bank declined the payment. No charge was made.** Try another card or contact your bank. | **Votre banque a refusé le paiement. Aucun montant n’a été débité.** Essayez une autre carte ou contactez votre banque. | Alert error；保留表单 |
| PAY_051 | 051 | – | **This card has expired. No charge was made.** Please use a different card. | **Cette carte est expirée. Aucun montant n’a été débité.** Utilisez une autre carte. | Alert error |
| PAY_076 | 076 | – | **Your bank declined the payment (insufficient funds). No charge was made.** Try another card or contact your bank. | **Votre banque a refusé le paiement (fonds insuffisants). Aucun montant n’a été débité.** Essayez une autre carte ou contactez votre banque. | Alert error |
| PAY_CVD | CVD ≠ M | – | The security code didn’t match. Check the 3 digits on the back and try again. | Le code de sécurité ne correspond pas. Vérifiez les 3 chiffres au dos et réessayez. | Alert error |
| PAY_AVS | AVS fail | billing | The billing address doesn’t match your bank’s records. Check it and try again. | L’adresse de facturation ne correspond pas aux dossiers de votre banque. Vérifiez-la et réessayez. | Alert error，焦点到账单地址 |
| PAY_3DS_FAIL | 3DS N/R | – | Your bank couldn’t verify this card. No charge was made. Try another card. | Votre banque n’a pas pu vérifier cette carte. Aucun montant n’a été débité. Essayez une autre carte. | Alert error |
| PAY_3DS_CANCEL | – | – | Verification was cancelled. Your order hasn’t been placed. | Vérification annulée. Votre commande n’a pas été passée. | Alert info |
| PAY_TICKET_EXPIRED | 482 / ticket | – | **Session expired.** For your security the payment form timed out after 30 minutes. Your cart is saved — reload to continue. | **Session expirée.** Par sécurité, le formulaire de paiement a expiré après 30 minutes. Votre panier est conservé — rechargez pour continuer. | 全屏态 + Reload payment |
| PAY_PENDING | receipt 未回 | – | Confirming your payment… Don’t close this page. | Confirmation du paiement… Ne fermez pas cette page. | 处理态；≥20 s 显示「我们会邮件通知结果」 |
| PAY_DUPLICATE | 幂等命中 | – | This order was already placed. Here’s your confirmation. | Cette commande a déjà été passée. Voici votre confirmation. | 直接进 Confirmation |
| PAY_AMOUNT_CHANGED | 服务端重算 ≠ 报价 | – | Prices or taxes changed while you were checking out. Review the new total before paying. | Les prix ou taxes ont changé pendant votre commande. Vérifiez le nouveau total avant de payer. | 回到 Review，税行闪烁 |
| PAY_SAVED_CVV | – | cvv | Enter the security code for your card ending {last4}. | Entrez le code de sécurité de la carte se terminant par {last4}. | 字段 |
| TAX_PROVINCE | 422 | province | Select the delivery province so we can calculate tax. | Sélectionnez la province de livraison pour calculer les taxes. | 字段 |
| CONSENT_REQUIRED | – | consent | **Consent required.** Please accept the Terms and acknowledge the Privacy Policy to continue. | **Consentement requis.** Acceptez les Conditions et prenez connaissance de la Politique de confidentialité pour continuer. | Review 步骤 Alert + 复选框红描边 |
| SHIP_METHOD | – | shipping | Choose a delivery option. | Choisissez une option de livraison. | 字段 |
| guest_address_required | 400 | shipping | Enter a delivery address to continue. | Entrez une adresse de livraison pour continuer. | 访客无地址簿，必须内联地址 |
| guest_checkout_unavailable | 403 | – | Sign in as a dealer to place this order. | Connectez-vous comme marchand pour passer cette commande. | 访客不能走 POS 通道 |
| rate_limited | 429 | – | Too many attempts. Please wait a few minutes and try again. | Trop de tentatives. Patientez quelques minutes et réessayez. | 访客下单 / 查单 / 重发回执限流 |
| claim_proof_required | 403 | – | We couldn’t attach that order. Open the link in your confirmation email and try again. | Impossible d’associer cette commande. Ouvrez le lien de votre courriel de confirmation et réessayez. | 认领必须持有该单 access token |

## 6. CONSENT · 通讯偏好与数据权利

| code | HTTP | EN | FR | UI |
|---|---|---|---|---|
| CONSENT_SMS_PHONE | 409 | Verify your mobile number first. | Vérifiez d’abord votre numéro de mobile. | 开关回弹 + 行内错误，链到 Profile |
| CONSENT_SAVED | 200 | Saved · {channel} {on/off} | Enregistré · {channel} {activé/désactivé} | Toast |
| EXPORT_202 | 202 | Requested. Check {masked} — usually within the day, always within 30 days. | Demande reçue. Consultez {masked} — généralement le jour même, au plus tard dans 30 jours. | 按钮 → Requested |
| EXPORT_429 | 429 | You already requested a copy today. We’ll email it as soon as it’s ready. | Vous avez déjà demandé une copie aujourd’hui. Nous vous l’enverrons dès qu’elle sera prête. | Toast info；按钮保持 Requested |
| EXPORT_LINK_410 | 410 | This download link has expired. Request a new copy from your account. | Ce lien de téléchargement a expiré. Demandez une nouvelle copie depuis votre compte. | 独立页面 |

## 7. SYS · 系统

| code | HTTP | EN | FR | UI |
|---|---|---|---|---|
| SYS_OFFLINE | – | You’re offline. Check your connection and try again. | Vous êtes hors ligne. Vérifiez votre connexion et réessayez. | 顶部横幅，恢复后自动消失 |
| SYS_500 | 500 | Something went wrong on our side. Nothing was charged. Try again in a moment. | Une erreur s’est produite de notre côté. Aucun montant n’a été débité. Réessayez dans un instant. | Alert error + Retry |
| SYS_503 | 503 | Payments are briefly unavailable. Your cart is saved — try again in a few minutes. | Les paiements sont temporairement indisponibles. Votre panier est conservé — réessayez dans quelques minutes. | Alert warning |
| SYS_TIMEOUT | – | That took too long. Check your connection and try again. | L’opération a pris trop de temps. Vérifiez votre connexion et réessayez. | Alert error |
| SYS_SESSION | 401 | You’ve been signed out for security. Sign in again to continue. | Vous avez été déconnecté par sécurité. Reconnectez-vous pour continuer. | 跳 `/login?redirect=` + Toast |

## 8. 实现要点

- 文案表放 `i18n/errors.{en,fr}.json`，键即 `code`；插值用 `{name}`；前端 `t(code, meta)`。
- 服务端日志记录原始 Moneris `response_code` / `message` 与 `iso_code`，但响应体里只带映射后的 `code`。
- `retryAfter`（秒）存在时，前端渲染倒计时并禁用主按钮；到 0 自动恢复。
- 每个 Alert 都带 `role="alert"`；字段错误用 `aria-describedby` 关联，`aria-invalid="true"`。
- 页面语言由 `<html lang>` 决定，法文下 Moneris iframe 传 `language: "fr"` 让托管字段同步。
