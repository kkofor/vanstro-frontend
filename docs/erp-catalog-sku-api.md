
商品主数据、上下架状态、平台 SKU、价格、图片、分类都在 VanStro Dashboard 维护；ERP 不需要自己维护平台可售商品池。经销商下采购 / 入库订单时，只调用接口读取“已上架可售商品 / SKU”来选择商品。

接口按 SKU 级别提供，初步字段包括：

- productId / productSlug / productName
- platformSkuId / skuCode / skuName
- category
- status，只返回 active/on-sale
- price / currency，如果你那边下单需要展示价格
- imageUrl，可选
- erpSkuKey / erpSystem，用于你们 ERP 商品编码映射
- updatedAt，用于增量同步

接口形式可以先定为：

```text
GET /api/v1/erp/catalog/skus
```

或：

```text
GET /api/v1/integrations/erp/products
```

会支持分页、updatedSince 增量参数，并用服务端 Bearer token，不走前台用户登录。

## 建议返回字段

```json
{
  "data": [
    {
      "productId": "platform-product-id",
      "productSlug": "base-cabinet-b33",
      "productName": "Base Cabinet B33",
      "platformSkuId": "platform-sku-id",
      "skuCode": "011090130",
      "skuName": "Base Cabinet B33",
      "category": "Kitchen Cabinets",
      "status": "active",
      "price": {
        "amountCents": 52500,
        "currency": "CAD"
      },
      "imageUrl": "/images/products/base-cabinet-b33.jpg",
      "erpSystem": "erp",
      "erpSkuKey": "ERP-SKU-001",
      "updatedAt": "2026-07-09T00:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

## 查询参数

建议支持：

```text
limit=100
offset=0
updatedSince=2026-07-09T00:00:00.000Z
status=active
```

后续如果需要，也可以支持：

```text
dealerId=xxx
warehouseId=xxx
category=xxx
```
