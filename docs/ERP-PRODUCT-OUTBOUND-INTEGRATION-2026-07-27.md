# VanStro 商品与销售出库 ERP 对接表

日期：2026-07-27
面向：ERP 开发人员
状态：Demo/本地接口已可请求；公网真实 API 尚未部署

## 1. 接口可用性结论

| 项目 | 当前状态 |
| --- | --- |
| 商品/SKU 导出接口代码 | 已实现 |
| 本地 API 请求 | 已通过 smoke、API tests 和多进程 E2E |
| GitHub backend-ci | 已通过 |
| 服务账号鉴权 | 已实现，Bearer token |
| 公网 `api.vanstro.ca` | 尚无 DNS，当前不能从公网请求 |
| ERP Mock 订单接口 | 已实现并通过本地 E2E |
| 真实 ERP 地址 | 尚未配置，后期替换 Demo/Mock |

当前实际商品接口：

```http
GET /api/v1/integrations/erp/catalog/skus
Authorization: Bearer <service-account-token>
```

所需权限：

```text
cli.access
erp.catalog.read
```

查询参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | ---: | --- |
| `limit` | integer | 100 | 每页数量，最大 500 |
| `offset` | integer | 0 | Offset 分页 |
| `updatedSince` | ISO 8601 | 空 | 只返回该时间之后更新的 SKU |

本地示例：

```bash
curl "http://localhost:4000/api/v1/integrations/erp/catalog/skus?limit=100&offset=0" \
  -H "Authorization: Bearer <service-account-token>" \
  -H "Accept: application/json"
```

> Token 必须由 Dashboard 创建 Service Account 后签发，不要通过聊天或代码仓库传递。

## 2. 商品/SKU 返回字段

| JSON 字段 | 类型 | 必有 | ERP 建议字段 | 说明 |
| --- | --- | --- | --- | --- |
| `productId` | string(UUID) | 是 | `website_product_id` | VanStro 商品主键，跨系统关联用，不可自行改写 |
| `productSlug` | string | 是 | `website_product_slug` | 网站商品 URL 标识 |
| `productName` | string | 是 | `product_name` | 商品名称 |
| `platformSkuId` | string(UUID) | 是 | `website_sku_id` | VanStro SKU 主键 |
| `skuCode` | string | 是 | `website_sku_code` | 平台业务 SKU 编码 |
| `skuName` | string | 是 | `sku_name` | SKU 名称/规格名 |
| `category` | string/null | 否 | `category_name` | 商品分类 |
| `status` | `active` | 是 | `sale_status` | 该接口只导出 active SKU |
| `price.amountCents` | integer/null | 否 | `sale_price_cents` | 售价，整数分；`52500` = CAD 525.00 |
| `price.currency` | string/null | 否 | `currency` | 当前结账仅允许 CAD |
| `imageUrl` | string/null | 否 | `primary_image_url` | 主图 URL |
| `erpSystem` | string/null | 否 | `erp_system` | ERP 系统标识 |
| `erpSkuKey` | string/null | 否 | `erp_sku_key` | ERP 自己的 SKU Key；与平台 `skuCode` 分开维护 |
| `erpProductId` | integer/null | 否 | `erp_product_id` | ERP 商品 ID |
| `erpSkuId` | integer/null | 否 | `erp_sku_id` | ERP SKU ID |
| `updatedAt` | ISO 8601 | 是 | `website_updated_at` | 增量同步游标 |

响应示例：

```json
{
  "data": [
    {
      "productId": "3144ef59-d25c-406d-83a0-19983cb7ecc0",
      "productSlug": "base-cabinet-b33",
      "productName": "Base Cabinet B33",
      "platformSkuId": "sku-uuid",
      "skuCode": "011780130",
      "skuName": "Base Cabinet B33",
      "category": "Kitchen Cabinets",
      "status": "active",
      "price": { "amountCents": 52500, "currency": "CAD" },
      "imageUrl": "/assets/products/base-cabinet-b33.jpg",
      "erpSystem": "configured-erp",
      "erpSkuKey": "ERP-SKU-001",
      "erpProductId": 12,
      "erpSkuId": 1001,
      "updatedAt": "2026-07-27T00:00:00.000Z"
    }
  ],
  "meta": { "limit": 100, "offset": 0, "total": 1 }
}
```

## 3. ERP 需要提供的销售出库订单接口

VanStro Worker 将调用：

```http
POST {ERP_API_BASE_URL}/orders
Authorization: Bearer {ERP_SERVICE_TOKEN}
Content-Type: application/json
Idempotency-Key: <VanStro order UUID>
```

ERP 必须按 `Idempotency-Key` 幂等：重复请求返回同一个 `erpOrderId`，不得重复生成销售出库单。

### 请求字段

| JSON 字段 | 类型 | 必有 | ERP 建议字段 | 说明 |
| --- | --- | --- | --- | --- |
| `externalOrderId` | UUID | 是 | `website_order_id` | VanStro 订单 ID，也是幂等键 |
| `email` | string | 是 | `customer_email` | 客户邮箱 |
| `firstName` | string | 是 | `customer_first_name` | 名 |
| `lastName` | string | 是 | `customer_last_name` | 姓 |
| `phone` | string | 是 | `customer_phone` | 电话 |
| `fulfillment` | `pickup`/`delivery` | 是 | `fulfillment_type` | 履约方式 |
| `paymentMethod` | `card`/`pos`/`cash` | 是 | `payment_method` | 支付方式 |
| `dealerLocationId` | UUID/null | 否 | `website_location_id` | VanStro 履约门店 ID |
| `erpLocationId` | string/null | 否 | `warehouse_id` | ERP 仓库/门店 ID |
| `subtotalCents` | integer | 是 | `subtotal_cents` | 折扣前商品小计 |
| `discountCents` | integer | 建议 | `discount_cents` | 优惠金额；当前 Worker 后续应一并传递 |
| `promotionKey` | string/null | 建议 | `promotion_code` | 优惠券/活动代码 |
| `taxCents` | integer | 是 | `tax_cents` | 税额 |
| `shippingCents` | integer | 是 | `shipping_cents` | 运费 |
| `totalCents` | integer | 是 | `total_cents` | 实付总额 |
| `currency` | string | 是 | `currency` | 当前 CAD |
| `items` | array | 是 | `lines` | 销售出库明细 |
| `inventoryLines` | array | 是 | `inventory_lines` | 库存扣减信息 |

### `items[]` 字段

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | --- | --- |
| `skuCode` | string | 是 | 平台 SKU 编码 |
| `erpSkuKey` | string/null | 建议必须 | ERP SKU Key；为空时应进入人工映射，不要猜编码 |
| `erpSkuId` | integer/null | 否 | ERP SKU ID |
| `quantity` | integer | 是 | 出库数量 |
| `unitPriceCents` | integer | 是 | 单价，整数分 |

### `inventoryLines[]` 字段

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | --- | --- |
| `skuId` | UUID/null | 是 | VanStro SKU ID |
| `dealerLocationId` | UUID/null | 否 | 履约门店 |
| `quantity` | integer | 是 | 扣减数量 |

### ERP 成功响应

```json
{
  "erpOrderId": "SO-2026-000123"
}
```

`erpOrderId` 必须是 string，且同一 `Idempotency-Key` 重放时保持一致。

## 4. ERP 回调 VanStro

### 4.1 订单状态

```http
POST /api/v1/integrations/erp/webhooks/order-status
X-ERP-Signature: HMAC-SHA256(secret, "erpSystem:orderId:externalId:status")
```

| 字段 | 类型 | 值 |
| --- | --- | --- |
| `erpSystem` | string | 双方约定，如 `configured-erp` |
| `orderId` | UUID | VanStro `externalOrderId` |
| `externalId` | string | ERP 不可变事件 ID |
| `status` | enum | `processing` / `fulfilled` / `cancelled` |

### 4.2 发货/送达

```http
POST /api/v1/integrations/erp/webhooks/shipment
X-ERP-Signature: HMAC-SHA256(secret, "erpSystem:orderId:shipmentId:status:trackingNumber")
```

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | --- | --- |
| `orderId` | UUID | 是 | VanStro 订单 ID |
| `shipmentId` | string | 是 | ERP 运单 ID |
| `status` | enum | 是 | `shipped` / `delivered` |
| `trackingNumber` | string | 否 | 物流追踪号 |
| `erpSystem` | string | 是 | ERP 系统标识 |

### 4.3 库存数量

```http
POST /api/v1/integrations/erp/webhooks/inventory
X-ERP-Signature: HMAC-SHA256(secret, "erpSystem:externalId:erpSkuKey:dealerLocationId:quantityOnHand")
```

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | --- | --- |
| `erpSystem` | string | 是 | ERP 系统标识 |
| `externalId` | string | 是 | 不可变库存事件 ID |
| `erpSkuKey` | string | 是 | ERP SKU Key |
| `dealerLocationId` | UUID | 是 | VanStro 门店 ID |
| `quantityOnHand` | integer >= 0 | 是 | ERP 当前实物库存 |

如果 `quantityOnHand < quantityReserved`，VanStro 会拒绝更新，避免破坏已预留订单。

### 4.4 客户更新

```http
POST /api/v1/integrations/erp/webhooks/customer-update
X-ERP-Signature: HMAC-SHA256(secret, "erpSystem:externalId:email:firstName:lastName:phone")
```

字段：`erpSystem`、`externalId`、`email` 必须；姓名和电话可选。

## 5. 金额与时间约定

- 所有金额均使用整数分：`amountCents`，禁止浮点金额。
- 币种当前为 `CAD`。
- 时间统一使用 ISO 8601 UTC。
- 所有 webhook 必须带不可变 `externalId`，VanStro 以数据库唯一约束实现幂等。
- ERP 应保留 VanStro ID 与 ERP ID 双向映射。

## 6. 当前是否能请求到数据？

**可以在本地 Demo/Staging 请求到。** 已完成真实 TCP 多进程 E2E，并验证商品、订单、ERP mock、签名回调和邮件。

**公网现在不能请求。** 原因：

- `api.vanstro.ca` 当前没有 DNS；
- 按当前阶段要求暂不部署线上；
- 真实 ERP URL/token 尚未配置。

ERP 同事当前可以选择：

1. 使用本地 API + Service Account token 联调；
2. 使用 `apps/erp-mock` 参考 `/orders` 幂等实现；
3. 等后续 staging API 部署后改为公网 URL，字段不变。

## 7. 联调验收清单

- [ ] Service Account token 可以读取商品 SKU。
- [ ] 分页和 `updatedSince` 正常。
- [ ] ERP 保存 `productId/platformSkuId/erpSkuKey` 映射。
- [ ] 重放 `/orders` 不生成重复出库单。
- [ ] ERP 返回稳定 `erpOrderId`。
- [ ] 状态、Shipment、库存和客户 webhook HMAC 验证通过。
- [ ] 重复 webhook 返回 duplicate success，不重复产生副作用。
- [ ] 金额总和满足：`subtotal - discount + tax + shipping = total`。
