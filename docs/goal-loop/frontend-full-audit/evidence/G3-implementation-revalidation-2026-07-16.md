# G3 MB01 商品内容与受控素材库实施复验

## 1. 结论

本轮 G3 返工的实施和复验结果为 **PASS，提交父线程验收**。本报告不自行把 `GOALS.md` 中的 G3 标记为 `done`。

已完成：

- 当前 MB01 快照中的 139 个父商品和 300 个公开变体全部进入本地商品数据。
- 27 个原缺失公开 SKU 已补齐；精确 SKU/型号搜索会展示并进入对应变体。
- 变体切换会同步更新型号、SKU、价格、尺寸、描述、参数、主图、完整图库和 URL。
- 把手商品已改为 `Aluminum alloy handle`，并提供 96 mm 与 192 mm 两个当前公开 SKU。
- 1,730 个来源素材 URL 对应的 1,216 份唯一字节内容已写入 VanStro 受控素材库。
- 源码、生产构建和静态导出中均未发现 `mb01.vanstro.ca` 运行时引用。
- 未修改 CSS、页面布局、模块结构、视觉层级或品牌配色。

## 2. 数据覆盖

| 对象 | 权威数量 | 本地数量 | 结果 |
| --- | ---: | ---: | --- |
| 父商品 | 139 | 139 | Pass |
| 公开变体 SKU | 300 | 300 | Pass |
| 变体字段全量匹配 | 300 | 300 | Pass |
| 字段不匹配 | 0 | 0 | Pass |
| 缺失变体 | 0 | 0 | Pass |

逐 SKU 结果见 `G3-implementation-2026-07-16/variant-verification.csv`。验证字段包括名称、一级类目、二级类目、SKU、型号、价格、描述、Highlights、参数、主图、图库集合和图库顺序。

## 3. 素材本地化

| 检查 | 结果 |
| --- | ---: |
| 来源素材 URL | 1,730 |
| 唯一内容哈希 | 1,216 |
| 本地受控文件 | 1,216 |
| 缺失本地文件 | 0 |
| SHA-256 不匹配 | 0 |
| SEO 文件名失败 | 0 |
| 静态导出缺失文件 | 0 |

公开文件名为小写 ASCII、数字和连字符，扩展名为准确的小写格式。完整来源 URL、SHA-256、SKU、图片角色和顺序保留在 `G3-implementation-2026-07-16/asset-provenance.json`，没有写进公开文件名或运行时商品数据。

195 组相同字节素材继续按一个受控路径复用。两个图库在源顺序中重复出现相同字节内容；实施保留了这些位置，未擅自删除权威图库项。

## 4. 变体图库与交互

原实现把颜色或配置变体的首图附加到父图库，导致切换后继续看到其他 SKU 的图片。本轮改为每个变体保存独立的：

```text
SKU -> 型号 -> 价格 -> 参数 -> 描述 -> 主图 -> 完整图库 -> 图片顺序
```

浏览器复验覆盖：

- 搜索原缺失 SKU `023021312`。
- 从搜索结果进入 `023021312` 对应 PDP。
- 从白色柜体单品切换到浅灰色柜体单品 `023021314`。
- 直接进入把手 `060102411`，核对 192 mm / 210 mm 内容。
- 切换回 `060101111`，核对 96 mm / 105 mm 内容和 URL 持久化。
- 所有受检图片完成加载、具有自然尺寸，控制台无 warning/error。

详细结果见 `G3-implementation-2026-07-16/browser-spot-checks.json`。

## 5. 零 MB01 运行时引用 Gate

| 扫描层 | 命中文件 | 结果 |
| --- | ---: | --- |
| `src/` | 0 | Pass |
| `.next/server` | 0 | Pass |
| `.next/static` | 0 | Pass |
| `out/` | 0 | Pass |
| 浏览器已渲染商品图片 | 0 个 MB01 URL | Pass |

采集与本地化脚本保留 MB01 权威来源地址，用于未来人工批准的重新同步；这些脚本不进入浏览器运行时。来源 provenance 只保存在 G3 审计证据中。

## 6. 构建与回归

| 命令 / 检查 | 结果 |
| --- | --- |
| `pnpm run typecheck` | Pass，web/db/api/worker/cli 全部通过 |
| `pnpm run build:pages` | Pass，170 个静态页面生成完成 |
| `node scripts/verify-localized-mb01-catalog.mjs` | Pass |
| `git diff --check` | Pass |
| 浏览器 PLP/PDP 定点检查 | Pass |

首次把 SKU 查询参数放进服务端产品页时，静态导出按预期拒绝动态 `searchParams`。返工后改为由现有客户端变体 Provider 读取并持久化 SKU，重新构建通过，GitHub Pages 的静态导出边界保持不变。

## 7. 变更范围

实施涉及：

- 商品变体类型和解析逻辑。
- PDP 现有价格、标识、图库、Overview 和参数模块的数据消费。
- PLP 精确 SKU/型号搜索结果解析和变体深链接。
- 本地化与复验脚本。
- `public/assets/products/` 受控素材库。
- 生成的 MB01 商品数据和 G3 证据。

没有执行 commit、push 或部署，也没有更新父目标状态。

## 8. 剩余风险与后续边界

- 本轮权威快照时间为 `2026-07-16T04:36:31.178Z`；MB01 后续商品变化需要重新采集并经过同一套哈希、字段和浏览器 gate。
- 本轮不处理 G7 的体积、格式、响应式图片和性能优化；75 MB 受控素材库的性能审查属于随后单独启动的 G7 rework。
- 页面已存在的横向溢出属于 G5/G7/G11 范围，本轮未改 CSS，也未改变已冻结版式。
- `scripts/sync-mb01-catalog.mjs` 是旧采集脚本；本轮可复现实施入口为 `scripts/localize-mb01-catalog.mjs`，复验入口为 `scripts/verify-localized-mb01-catalog.mjs`。

## 9. 证据索引

| 文件 | 用途 |
| --- | --- |
| `G3-implementation-2026-07-16/localization-summary.json` | 本地化数量与写入结果 |
| `G3-implementation-2026-07-16/asset-provenance.json` | 来源、哈希、本地路径、SKU、角色和顺序 |
| `G3-implementation-2026-07-16/verification-summary.json` | 300 SKU、文件、命名、导出和零引用总 gate |
| `G3-implementation-2026-07-16/variant-verification.csv` | 逐 SKU 字段和图库结果 |
| `G3-implementation-2026-07-16/browser-spot-checks.json` | PLP、PDP、变体和把手浏览器复验 |
| `scripts/localize-mb01-catalog.mjs` | 可复现本地化和商品数据生成 |
| `scripts/verify-localized-mb01-catalog.mjs` | 可复现完整 G3 验证 |

## 10. 父线程验收建议

父线程可按以下条件验收 G3：

1. `verification-summary.json` 的 `pass` 为 `true`。
2. 300 个变体全部为 `Matched`。
3. 本地文件、哈希、命名和静态导出缺失均为 0。
4. 源码、生产构建、静态导出和浏览器运行时 MB01 引用均为 0。
5. 浏览器中精确 SKU 搜索、变体深链接、变体切换和把手商品全部通过。

本线程只提交证据，不自行修改 `GOALS.md` 中 G3 的状态。
