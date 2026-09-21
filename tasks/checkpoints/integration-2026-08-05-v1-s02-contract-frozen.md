# Integration — v1 S02 General/Brand/Storefront/Localization Implementation Contract

Date: 2026-08-05
Status: **S02 CONTRACT FROZEN — IMPLEMENTATION NOT STARTED**

## Authority

Coordinator prompt SHA-256: `71cab6414dcc245b2559120816da4536656fa71388ddbd1a51b5cc2d10fbabae`.
Baseline Integration HEAD: `d27a5780089e1e3cde6f92806027993dce99f5be` (tree `41f0d0992da9ce999b3853516a3d1ae6201e743f`).

## Descriptor freeze

- **descriptor key**: `settings.general-storefront`（不带版本后缀，遵循 S01 确定性命名规则：`settings.<group>.<name>`；S01 core 为 `settings.core.overview_refresh_seconds` 亦无版本后缀）
- **schema version**: `settings.general-storefront.v1`
- group: `general`；value type: `object`；secret: `false`；scope: global；mutable: true
- 原子单 descriptor，一个 publication stream，`partialPublish=false`
- 禁止同时支持别名/双 key；实现中途不改名

## Typed value shape — `GeneralStorefrontSettingsValueV1`

顶层 exact keys（五个字段族，均 required）：

```ts
{
  generalIdentity: GeneralIdentityV1;
  brand: BrandV1;
  storefront: StorefrontRulesV1;
  localization: LocalizationV1;
  defaultDealerLocation: DefaultDealerLocationV1;
}
```

### generalIdentity
| field | type | 边界 | fallback | business validation | safe-diff |
|---|---|---|---|---|---|
| siteDisplayName | string | 1–120, trimmed | compiled `VanStro Global Supply` | 非空 | public |
| legalName | string | 1–200 | compiled | 非空 | public |
| canonicalUrl | string | http(s) URL ≤ 2048 | compiled | URL 有界 | public |
| contactEmail | string | email 有界 | compiled | email 结构 | public |
| contactPhone | string | 10–25 digits/+/-/space | compiled | phone 结构 | public |
| contactAddress | object {line1, line2?, city, province, postalCode, country} | 各 string 有界 | compiled | postal 结构（CA） | public（地址为公开联系信息，非 PII 敏感；但 Audit 不记录值） |
| defaultTimezone | string | Canada IANA allowlist（21 项） | compiled | allowlist + Intl 可识别 | public |

Canada IANA timezone allowlist（冻结）：`America/St_Johns, America/Halifax, America/Moncton, America/Glace_Bay, America/Goose_Bay, America/Blanc-Sablon, America/Toronto, America/Iqaluit, America/Winnipeg, America/Rankin_Inlet, America/Regina, America/Swift_Current, America/Edmonton, America/Cambridge_Bay, America/Inuvik, America/Dawson_Creek, America/Fort_Nelson, America/Creston, America/Vancouver, America/Whitehorse, America/Dawson`。非法 zone 稳定 400。v1 不允许非加拿大 zone。

### brand
| field | type | 边界 | fallback | 备注 |
|---|---|---|---|---|
| brandName | string | 1–120 | compiled | public |
| brandDescription | string | 0–500 | compiled 空 | public |
| logoMediaRef | uuid? | media asset id | null（当前用静态 logo） | P07 引用，只存 id |
| faviconMediaRef | uuid? | media asset id | null | P07 引用 |
| baseColors | object {primary?, secondary?, accent?} | hex 色值 `#RRGGBB`/`#RRGGBBAA` | compiled 空 | 仅冻结当前 UI 可安全消费的色值；当前 UI 未消费 → **从 editable schema 移除，只读/compiled**（checkpoint 披露） |
| fontFamily | string | 仅当前 UI 真实可消费值 | compiled | 当前无字体切换 consumer → **从 editable schema 移除，只读/compiled**（checkpoint 披露） |

### storefront
| field | type | 边界 | fallback | 备注 |
|---|---|---|---|---|
| homeContentRef | uuid? | CMS SiteContentModule id | null | CMS 引用 |
| navigationRef | uuid? | CMS id | null | CMS 引用 |
| footerRef | uuid? | CMS id | null | CMS 引用 |
| defaultProductSort | enum | `newest\|price_asc\|price_desc\|featured` | compiled `newest` | public |
| outOfStockDisplay | enum | `hide\|show\|hide_with_contact` | compiled `show` | public |
| dealerSelectionEnabled | boolean | — | true | public |
| cartCheckoutEnabled | boolean | — | true | public |
| announcementRule | object {enabled, message, locale?, startsAt?, endsAt?} | message ≤ 300 | null | **本轮真实消费字段**：SiteHeader 显示 |
| maintenanceBannerRule | object {enabled, message} | message ≤ 300 | null | 仅冻结，无消费 → 只读/compiled 披露 |
| storefrontConfigRef | uuid? | modules.ts `storefront_config` legacy row id | null | **只引用 legacy fact，不回写** |
| enFrRoutesEnabled | boolean | — | true | public |

### localization
| field | type | 边界 | 备注 |
|---|---|---|---|
| defaultLocale | enum | `en-CA\|fr-CA` | public |
| supportedLocales | array | 仅 `en-CA`/`fr-CA`，含 defaultLocale | public |
| dashboardLocale | literal | `zh-CN`（固定只读 literal，不错误复用 `SiteLocale`） | 受限 literal |
| currency | literal | `CAD`（v1 唯一） | public |
| timezone | string | 同上 Canada allowlist | 与 generalIdentity.defaultTimezone 一致校验 |
| dateFormat | enum | `yyyy-mm-dd\|dd-mm-yyyy\|mm-dd-yyyy` | public |
| phoneFormat | enum | `national\|international` | public |
| addressFormat | enum | `canada_default` | public |
| weightUnits | enum | `kg\|lb` | public |
| dimensionUnits | enum | `cm\|in` | public |
| translationFallback | enum | `en_ca`（v1 固定 en-CA fallback） | public |
| provinceServiceMapping | array of {province, dealerRef?, locationRef?} | 有界 | 仅引用，不复制 |

### defaultDealerLocation
| field | type | 边界 | 备注 |
|---|---|---|---|
| defaultDealerRef | uuid? | Dealer id | 必须与 defaultLocationRef 配对 |
| defaultLocationRef | uuid? | DealerLocation id | 必须属于 defaultDealerRef 对应 dealer |

## Structural vs business validation

- API/DB 结构层：错误类型、unknown key、unsafe size、malformed UUID、过深/过大 JSON → 稳定 400
- 结构正确但业务无效的 draft 可保存；validate 产生 blocker/warning/info 并持久化 `invalid` 或 `validated`
- business 规则：missing CMS/Media/Dealer ref（blocker）、locale 关系冲突（defaultLocale ∉ supportedLocales → blocker）、defaultDealer/defaultLocation 不配对（blocker）、timezone 非法（结构层 400）
- PATCH 可修复 invalid draft 后重新 validate
- Frontend 本地提示不替代 server lifecycle

## API freeze

### Dashboard（严格 allowlist，仅两个 descriptor）
- 复用现有 `/dashboard/settings/*` 端点，create/list/detail/PATCH/validate/diff/publish/history/rollback/readiness 全部带 `descriptorKey` 参数（严格 allowlist：`settings.core.overview_refresh_seconds` | `settings.general-storefront`）
- S01 现有 API 完全兼容（descriptorKey 缺省时默认 S01 core，保持既有 DTO）
- S02 值类型 object：create/PATCH 的 `value` 为 `GeneralStorefrontSettingsValueV1`
- safe diff 按字段路径输出（`generalIdentity.siteDisplayName` 等），不返回领域对象内容
- history append-only，publication sequence 按 descriptor 单调
- 现有 `settings.read/settings.write`，无新 permission

### Public（只读，无 Dashboard actor）
- 新增 `GET /storefront/config?locale=en-CA|fr-CA`：返回 public-safe effective config（siteDisplayName、announcementRule、brandName、contact 概要、dealer/location 解析后 public-safe 引用）+ `publishedGeneration`
- locale 仅 en-CA/fr-CA；缺 fr 内容按 en-CA fallback
- 无 publication / API 不可用 → 服务端返回 compiled fallback + `projectionState: "compiled_default"` + `publishedGeneration: 0`
- 不接受 Dashboard actor 自报权限；不暴露 draft/history/Audit

## Storefront consumer（最小链路，冻结）

1. `StorefrontProvider` 扩展：客户端启动时 `GET /storefront/config?locale=<locale>`，保存 `loading|ready|degraded|error` 与 public-safe effective config；AbortController/generation fence；actor/locale 切换不覆盖新 projection
2. `SiteHeader` 最小消费：`siteDisplayName`（品牌名文本，静态 logo alt 保留）与 `announcementRule`（enabled 且 message 非空时显示 announcement bar）；保留静态 copy fallback
3. publishedGeneration 握手：Provider 安装 effective config 后第二次只读确认 consumer 已应用 generation；精确匹配才 ready；握手不阻止 safe config 展示，但状态诚实
4. static export：静态 HTML 显示 compiled fallback，hydration 后从公开 API 加载并更新可见字段（不需 SSR 重建/重启）
5. SiteFooter 可消费 safe contact/brand projection，非硬前置；不重写导航/Footer/CMS

## Parity exit（逐字段）

- **真实消费**：siteDisplayName（SiteHeader）、announcementRule（SiteHeader）
- **仅冻结/只读（无真实 consumer，从 editable 移除）**：baseColors、fontFamily（当前 UI 无消费）、maintenanceBannerRule、emailLogoMediaRef、socialShareMediaRef（无消费）、provinceServiceMapping 部分字段（保守保留在 schema 但 UI 只读）
- **fallback/compiled**：无 S02 publication 时全部字段用 compiled/domain fallback
- **legacy**：`storefront_config` raw JSON 保持可用，不可覆盖已 ready 的 S02 scalar/policy；同一字段不得同时由 S02 与 legacy 写入

## Migration75 边界（Backend 唯一 owner）

- `packages/db/prisma/migrations/20260805120000_s02_general_storefront/migration.sql`
- S01 `_v2` 函数 + advisory lock + SQL body + signature + ACL **逐字保留**
- S02 新增独立 `s02_*` 受控函数，独立 lock domain（`settings.general-storefront`）
- idempotency 独立 operation family（`s02_create_draft` 等）
- ledger operation CHECK 前向扩展；不新增 descriptor 列、不改 S01 operation 值、不迁移既有唯一键
- migrations 1–74 SHA 不变；fresh 0→75、41→75、74→75；无 migration76
- 不创建 secret/provider/新 permission；不复制 CMS/Media/Dealer 事实

## Shared contract leases

- `api-contract.ts`、runtime validators、Settings registry/access、route contract：Integration 串行租约，S02 实施期间独占
- migration75：仅 S02 拥有
- Backend/Frontend 分别在自己 worktree 实现，正常 --no-ff 双亲 merge 回 Integration

## 明确非范围

S09/S10/S03–S12、CMS structured publication（B08）、Media provider（S11/v3）、Dealer 管理（B06）、多站点/多币种（v3）、Dashboard 移动（v3）、secret/provider/Payment/Email/ERP/Webhook、v2 22 项、Main/生产/部署。

## Next action

Backend 标准 worktree 同步本 contract 后实现 migration75 + DB/API/public projection + tests；Frontend 同步后实现 S02 页面 + StorefrontProvider/SiteHeader 接线；Integration 正常双亲 merge 后全门禁 + Browser evidence。
