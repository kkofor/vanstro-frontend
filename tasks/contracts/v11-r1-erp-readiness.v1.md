# VanStro ERP 接入优先级修复 — 冻结 Contract v1

- 版本：v1
- 冻结时间：2026-08-13
- 上游：`erp-product-api-v1-compatibility-contract.{md,json}` 与 `v1-erp-product-api-priority-overlay.md`（AI_OS 状态根）
- 基线：Integration `ee6f4b1aedd17bc12610e160d7cb401d0e3074d6` / tree `be662e25db94bfd4f4ebb840f3fb8c050b9a35a3`
- 迁移基线：81，上限 `20260810110000_s12_erp_webhooks`；新迁移一律从 81 向前追加（#82 起），不得改历史迁移。

本文件是 Wave 2 冻结结果，是 Backend/Frontend 实施的唯一语义权威。上游兼容契约与 overlay 仍是外部边界权威；本文件解决六域调查发现的未决字段 owner 与 schema 差距。

## 1. 稳定 ID 与外部映射

| 域 | VanStro 内部 ID | ERP 外部 ID | 现有/新增存储 |
|---|---|---|---|
| Product | `Product.id`(UUID) + `slug`(unique) | erpProductId/erpSkuId(Int, 在 SKU mapping 行) | 现有 `ProductSkuErpMapping` |
| Variant/SKU | `PlatformSku.id` + `skuCode`(global unique) | erpSystem + erpSkuKey + erpSkuId | 现有 `ProductSkuErpMapping`，`UNIQUE(skuId,erpSystem)` + `UNIQUE(erpSystem,erpSkuKey)` |
| Category | `Category.id` + `slug` | erpSystem + erpCategoryKey + erpCategoryId | **新增** `erp_category_mappings` |
| Location | `DealerLocation.id` + `code` | erpSystem + erpLocationId | 现有 `DealerErpLink`，需扩展到入站 |
| Order | `Order.id` | erpOrderId | 现有 `ErpOrderLink` |

硬约束：

- 禁止仅凭名称、颜色文本、显示顺序或可变 slug 匹配 SKU/Category/Location。
- 无法映射的 SKU/Category/Location 必须逐条失败并保留诊断（错误码 `ERP_MAPPING_INCOMPLETE`），禁止归入任意默认 Dealer 或 `uncategorized` 分类。
- 同一 ERP Product/SKU/Category/Location 重复同步不得产生重复记录（依赖上表唯一约束）。

## 2. Product ↔ Variant/SKU 边界

- `Product` 仅承载所有 Variant 共用的名称、描述、分类、品牌、公共规格、公共媒体。
- 仅展示且不影响购买的属性 → `ProductSpecification`。
- 会影响 SKU、库存、价格、图片或购买选择的颜色/规格组合 → 独立 `PlatformSku`。
- 每个 `PlatformSku` 有稳定内部 ID、唯一 `skuCode`、状态、可选 ERP 外部 ID。
- 前台正式数据存在时，mock/fallback 不得覆盖任何字段（当前 `server.ts` 字段级 fallback merge 违规，需修正）。

## 3. Inventory 粒度与 owner

- 库存唯一粒度：`DealerLocation + Variant/SKU`。
- `onHand`（实库）ERP-owned；`reserved`（预留）VanStro-owned；`available = onHand - reserved`（派生，不落库）。
- 入站 ERP 库存按 `DealerErpLink.erpLocationId` 解析到 VanStro DealerLocation；无法映射 → 逐条失败，不归默认。
- 同一 SKU 在不同 Dealer 独立库存；同一 Product 不同颜色/规格 SKU 独立库存。
- Cart/Checkout 提交并校验精确 `dealerLocationId + skuId`；并发预留不得使 available<0（现有 guarded UPDATE 保持）；取消/失败/超时释放原 Dealer 原 SKU 预留。
- Storefront 未选 Dealer 不得展示跨 Dealer 合计；多仓 SKU 的 ERP 读取不得返回任意首条快照（需确定性，缺 location 参数时显式返回 `INVENTORY_NO_DEALER`）。

## 4. Price owner 与 active 语义

- 字段 owner：`amountCents`（基础售价）+ 未来 `cost` = ERP-owned；`compareAtCents`（营销折扣）+ `status`（发布状态）= VanStro-owned。
- Price 行新增 `source`（TEXT NOT NULL default 'vanstro'，枚举 vanstro|erp）、`externalVersion`（INT nullable）、`sourceUpdatedAt`（timestamptz nullable）。
- ERP 写入价格必须标记 source='erp' 并带 externalVersion；ERP 非 owner 时不得用空值覆盖 VanStro 字段（compareAtCents/status 不得被 ERP 空值清除）。
- active price 语义：单个 `(skuId, currency)` 在任一时刻至多一个 active；active = `status='active'` AND `effectiveFrom<=now<effectiveUntil`（null 视为无界）。新增部分唯一约束防止重叠 active。
- 展示（目录/详情/首页）与结算（Cart/Checkout）必须使用同一 active price 判定；不得回退到其他 SKU、其他币种、过期价或 mock 价；无匹配购物车币种 active price 时服务端拒绝加购/结算（现有 409 语义保持，展示不得显示 $0.00 假可购价）。

## 5. Category owner

- ERP owns：分类代码、名称、状态。VanStro owns：显示顺序、SEO。
- 未匹配分类逐条失败，不静默归入默认；ERP 不再返回分类时不得删除仍被引用的分类（停用/归档）。

## 6. Order Line 与地址快照

- Order Line 引用稳定 `skuCode`（NOT NULL）+ `skuId` + `dealerLocationId` 快照；不依赖商品名/颜色文本。
- 历史订单地址为下单时不可变快照，独立于账户当前地址；不得向 ERP 返回账户当前地址冒充下单地址。
- ERP 订单接口为只读契约；发货/取消/退款回写字段 owner 未冻结前不新增回写端点。

## 7. 同步幂等与错误语义（canonical ingest）

- push 与 pull 共享唯一 canonical ingest（`dashboard/batch-ingest.ts` 异步 worker + `batch_ingest_results` ledger）。
- `requestHash` 必填；同时读取 `Idempotency-Key` 头；重复请求幂等（replay 200 / conflict 409）。
- dry-run 不得创建 AsyncJob 或写 ledger（当前违规，需修正）。
- 批量超限返回 `413`（当前 400，需修正）；单条失败逐条结果 + 安全重试。
- push 对非 owner 字段不得静默忽略或覆盖，必须逐条返回明确结果。
- pull（`syncProductsFromUpstream`）当前直写 DB 绕过 canonical ingest，需路由回 canonical ingest 或明确标记 legacy 隔离。

## 8. 交付边界

- 不新增第二套同步系统、不新增临时表、不物理删除、不改历史迁移。
- 真实 ERP endpoint/凭据缺失不阻断内部 Contract/adapter/mapping/测试；但未联调前只可声明「内部 READY，真实联调待完成」。
- 产品 JSON 批量导入 UI/页面/导航删除属于本轮授权（Frontend），共享 Import/Export Foundation 保留。
