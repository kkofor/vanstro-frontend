# 10 · 两条支付通道

现有 **Hosted Tokenization** 结账扣款不改。另开经销商通道：用户中心点「付款」推到该店 Vanstro Moneris Go。

| | 通道 1 · 网上卡 | 通道 2 · 店内 POS |
|---|---|---|
| 谁 | 普通客户 | `role=dealer` |
| 何时付 | 结账页 Pay | 下单后，账户 → Orders → Pay |
| API | `POST /api/checkout/moneris/pay` | `POST /api/orders/:orderNo/push-pos` |
| Moneris | HT iframe + REST `/payments` | Go Cloud `purchase` + `terminalId` |
| 商户 | Vanstro | 同一 Vanstro 户，每经销商独立终端 |

## 原型怎么走

1. 登录 `dealer@vanstro.ca` / `Vanstro2026!`，或注册选 **Dealer** 并填写 Vanstro 发给该店的专属邀请码（原型：Yuan = `VS-MB10-K4F9`）。不能从下拉自选门店。  
2. 结账不出现卡框；Place order → `payment.method=pos`。  
3. `account.html#orders` 未付单有 **Pay**。  
4. `MONERIS_MOCK=1` 时点 Pay 立即已付。真机需 `MONERIS_GO_*`、`MONERIS_GO_TERMINALS=MB-YUAN:<terminalId>`、`VANSTRO_LINK_SECRET`。刷卡后 postback `POST /api/checkout/moneris/go/postback?t=<hmac>`（须带 `responseCode`，金额须与订单一致；缺码不再默认 027）。

HT 的 `/pay` 若打到 POS 订单会 **409 `wrong_channel`**。Push 只允许 `session.dealerId === order.dealer.id`，终端取自订单上的 `posTerminalId`。同一 `idempotencyKey` 可在约 10 分钟后重试。

邀请码走 `GET /api/dealers/invite?code=`，与 `lib/dealers.ts` 同源。
