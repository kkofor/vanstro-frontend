# Dashboard 写表单字段 UX 矩阵

> 范围：后台（F0 中文界面）已启用写表单中用户可见的模糊字段（key/键名/slug/code/external key 等）的标签与只读性/自动生成逻辑清理。
> 原则：不改底层字段名/存储，不改 API 契约语义；仅改用户可见 label、helper 文案与自动生成/可编辑行为。
> 页面来源：`src/components/dashboard/DashboardPanels.tsx`（Products / Categories / Pricing / Promotions / Roles / Dealers / Email Outbox / CMS），标签文案来源：`src/lib/i18n/dashboard-copy.ts`（简体中文 F0 copy，en/fr 旧 copy 保持字节稳定，未改动）。

## 字段分类口径（提示词第七节矩阵）

| 类别 | 处理方式 |
| --- | --- |
| 业务名称 | 用户直填，保持可编辑 |
| URL slug（产品/分类/文章页面网址） | 按业务名称自动生成，可高级修改（编辑框始终可改） |
| 内部系统键（价格类型/促销标识/角色标识/模板标识） | 自动生成默认值（按名称 slugify 或服务端生成唯一值），标注业务含义；保留可编辑以兼容中文名称（slugify 中文为空）与重名场景 |
| Dealer/Location code | 标为「经销商编号 / 网点编号」，可编辑（同经销商内唯一） |
| ERP 外部编号 | 标注具体含义（ERP SKU 编码 / ERP 产品编号 / ERP SKU 记录编号 / ERP 网点编号） |
| 幂等键 / descriptor key / 技术常量 | 不暴露给普通管理员（保持内部，本次无 UI 改动） |

## 字段 UX 矩阵

| 页面 | 字段（存储名不变） | 旧标签 | 新标签 | 业务含义 | 自动生成 | 可否编辑 | 唯一性 | 修改影响 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 产品（创建/编辑） | `slug` | 网址标识 | 页面网址 | 产品详情页 URL 路径段 | 是：名称留空时按名称 slugify（前端），服务端亦有兜底 | 可（高级） | 唯一（服务端约束） | 修改后旧网址不再生效（helper 已注明） |
| 产品（SKU 创建） | `skuCode` | SKU 编码 | SKU 编号 | 商家自定义货号/规格编号 | 否 | 可 | 全局唯一（`@@unique([productId, skuCode])`） | 用于价格、库存与 ERP 关联 |
| 产品（编辑-规格） | `spec.key` | 规格键 | 规格标识 | 规格项英文标识（如 material/weight） | 否 | 可 | 产品内唯一（`@@unique([productId, key])`） | 与规格值成对展示 |
| 产品（编辑-ERP 映射） | `erpSkuKey` | ERP SKU 键 | ERP SKU 编码 | ERP 系统中该 SKU 的编码，同步匹配键 | 否（默认取当前 SKU 编号） | 可 | `@@unique([erpSystem, erpSkuKey])` | 变更后 ERP 同步按新编码匹配 |
| 产品（编辑-ERP 映射） | `erpProductId` | ERP 产品 ID | ERP 产品编号 | ERP 系统中的产品编号（数字） | 否 | 可 | 非唯一约束 | 用于 ERP 颜色/详情拉取 |
| 产品（编辑-ERP 映射） | `erpSkuId` | ERP SKU ID | ERP SKU 记录编号 | ERP 系统中的 SKU 记录编号（数字） | 否 | 可 | 非唯一约束 | 用于 ERP 颜色/详情拉取 |
| 产品（编辑） | `productHighlights` | 产品亮点 JSON | 产品亮点（JSON） | 店面产品亮点结构化数据 | 否 | 可（高级 JSON 编辑） | 不适用 | 展示于产品详情页 |
| 分类（创建） | `slug` | 网址标识 | 页面网址 | 分类页 URL 路径段 | 是：名称留空时按名称 slugify | 可（高级） | 唯一（服务端约束） | 修改后旧网址不再生效 |
| 分类（详情抽屉） | `slug`（只读展示） | Slug | 页面网址 | 同上（只读） | — | 只读 | — | — |
| 定价（创建） | `key` | 键名 | 价格类型 | 价格类型标识（如 retail 零售价） | 是：留空时服务端生成 `retail:{skuId}` 唯一值 | 可（高级） | 全局唯一（`@unique`） | 标识价格类型/价格表；留空最安全 |
| 促销（创建） | `key` | 键名 | 促销标识 | 促销系统标识，按名称自动生成 | 是：默认按名称 slugify | 可（高级，兼容中文名/重名） | 全局唯一（`@unique`） | 用于促销关联；建议创建后不改 |
| 角色（创建） | `key` | 键名 | 角色标识 | 角色权限标识（英文），按名称自动生成 | 是：默认按名称 slugify | 可（高级，兼容中文名） | 全局唯一（`@unique`） | 用于权限匹配/服务账号角色引用；创建后不建议改 |
| 经销商（列表/详情） | `dealer.code` | 代码 | 经销商编号 | 经销商业务编号 | 否 | 详情只读展示（后端 PATCH 不支持改 code） | 全局唯一（`@unique`） | 用于 ERP/库存关联识别 |
| 经销商（网点创建/编辑） | `location.code` | 代码 | 网点编号 | 网点业务编号 | 否 | 可 | 同经销商内唯一（`@@unique([dealerId, code])`） | 用于库存与订单归属 |
| 经销商（ERP 关联创建/列表） | `erpLocationId` | 外部键 | ERP 网点编号 | 该 ERP 系统中此网点的编号/ID | 否 | 可 | `@@unique([erpSystem, erpLocationId])` | 用于库存/订单同步位置解析 |
| 邮件模板（列表） | `template.key` | 键名 | 模板标识 | 邮件模板系统标识（如 order-confirmation） | 否（系统预置） | 不可（表单仅改名称/内容） | 全局唯一（`@unique`） | 展示于发件箱与模板列表 |
| CMS 文章（创建） | `slug` | 网址标识 | 页面网址 | 文章页 URL 路径段 | 是：标题留空时按标题 slugify（本次新增前端自动生成） | 可（高级） | `@@unique([slug, locale])` | 修改后旧网址不再生效 |
| CMS 法律页面（列表） | `slug`（只读展示） | 网址标识 | 页面网址 | 法律页 URL 路径段 | — | 只读 | `@@unique([slug, locale])` | — |

## 已隐藏/保持隐藏的技术字段（普通管理员不可见）

| 字段 | 说明 |
| --- | --- |
| `idempotencyKey` | 幂等键：所有写请求内部自动生成（`key("create")` 等），无 UI 暴露 |
| `descriptorKey`（S01/S02/S03/S08/S09/S10） | 设置描述键：内部常量，仅出现在审计 metadata，无 UI 暴露 |
| `expectedPublishedVersion` / CAS / revision | 并发控制技术常量：内部传递，无 UI 暴露 |
| 对象主键 ID（产品/分类/价格/促销等） | 仅在只读详情中以「XX ID」展示，不可编辑 |

## 关键决策与理由

1. **价格类型 key 留空自动生成**：`Price.key` 为全局唯一。前端改为可留空，留空时省略该字段，服务端生成 `retail:{skuId}`（既有 API 契约，未改语义）。不再强制管理员手工输入可能冲突的 key。
2. **促销/角色 key 保留可编辑**：F0 界面为中文，中文名称 slugify 结果为空字符串，若做成只读将导致无法创建；同时全局唯一约束下重名需要人工区分。因此采用「默认按名称自动生成 + 可高级编辑 + 明确 helper」。
3. **URL slug 保持必填可编辑**：服务端在名称为空 slug 时会 400（slugify 中文为空），前端保持 `required` 并加 helper 说明英文短横线格式。
4. **经销商编号仅只读展示**：后端 `PATCH /dashboard/dealers/:id` 不接受 `code`（`dealers.ts` 只读 name/status），按「不改 API 契约语义」约束不新增前端编辑入口；网点编号两端均可编辑。
5. **en-CA/fr-CA 旧 copy 字节稳定**：`dashboard-copy.test.ts` 对 en/fr 指纹固定、对中文 copy 数量固定（457 项），本次仅改中文 copy 的值，未增删 key，未触碰 en/fr。

## 改动文件清单

- `src/lib/i18n/dashboard-copy.ts`：简体中文 copy 值（10 处标签文案）
- `src/components/dashboard/DashboardPanels.tsx`：QuickForm 增加可选 hint；各面板标签/helper/自动生成行为
- `qa/v11-auth-browser/v11-r1-functional-first-acceptance.py`：适配新标签（网点编号 / ERP 网点编号）
- `qa/v11-auth-browser/v11-6-commerce-acceptance.py`：适配新标签（经销商编号）
- `docs/dashboard-field-ux-matrix.md`：本矩阵
