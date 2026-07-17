import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "关于 VanStro",
  description:
    "了解 VanStro Global Supply Inc.，一家总部位于加拿大曼尼托巴省温尼伯的建材供应与分销平台。",
  path: "/zh/about",
  image: "/assets/generated/vanstro-hero-white-v1.webp",
  locale: "zh_CN",
  languages: { "en-CA": "/about", "zh-CN": "/zh/about" }
});

const apartItems = [
  {
    title: "覆盖加拿大的统一标准",
    text:
      "客户和经销商伙伴可以获得一致的产品标准、透明合理的价格，以及务实的服务承诺。"
  },
  {
    title: "全球供应链与有竞争力的价格",
    text:
      "长期制造合作和供应链管理，让 VanStro 能以更有竞争力的方式把优质产品引入加拿大市场。"
  },
  {
    title: "本地服务，全国支持",
    text:
      "授权本地经销商熟悉当地市场，同时背后有全国分销平台提供资源支持。"
  },
  {
    title: "可追溯的质量管理",
    text:
      "产品在分销过程中经过检查、质量控制、标签管理，并保持可追溯。"
  }
];

export default function AboutZhPage() {
  return (
    <>
      <section className="page-hero about-profile-hero">
        <div className="container about-profile-hero-grid">
          <div>
            <PageBreadcrumb items={[{ label: "首页", href: "/" }, { label: "关于我们" }]} />
            <h1>不只是供应商。</h1>
            <p className="about-profile-lede">
              VanStro Global Supply Inc. 是一家总部位于加拿大曼尼托巴省温尼伯的公司。
            </p>
            <p>
              我们是面向加拿大市场的供应链和分销平台，专注于建筑材料，包括可组装厨房橱柜、
              浴室柜、墙板、踢脚线以及相关产品。
            </p>
            <div className="about-profile-actions">
              <Link className="button button-primary" href="/products">
                浏览产品
              </Link>
              <Link className="button button-secondary" href="/zh/contact">
                联系我们
              </Link>
            </div>
          </div>
          <figure className="about-profile-visual">
            <img
              src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")}
              alt="VanStro 白色橱柜产品存放在经销商仓储库存中"
              width={1672}
              height={941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container about-profile-layout">
          <article className="about-profile-main">
            <h2>用更高效的方式，把建筑材料带到加拿大市场</h2>
            <p>
              通过与主要制造商建立长期合作，并持续建设全国分销网络，VanStro 为加拿大客户
              和经销商提供稳定质量、可靠供应、有竞争力的价格和本地支持。
            </p>
            <p>
              我们的使命，是把世界级制造能力与本地服务连接起来，让建筑材料在加拿大的流通
              更智能、更高效。
            </p>
            <p>
              我们相信，强大的本地企业是社区发展的基础。VanStro 平台的设计，也正是为了支持
              本地伙伴的长期成长。
            </p>
          </article>
          <aside className="about-profile-facts" aria-label="公司亮点">
            <span>总部位于曼尼托巴省温尼伯</span>
            <span>加拿大建筑材料供应平台</span>
            <span>橱柜、浴室柜、墙板、踢脚线及相关产品</span>
            <span>授权本地经销商分销网络</span>
          </aside>
        </div>
      </section>

      <section className="page-panel about-profile-panel alt">
        <div className="container about-profile-layout">
          <div className="about-profile-section-heading">
            <h2>我们做什么</h2>
            <p>
              VanStro 负责产品采购、供应链协调和分销支持，让客户与经销商伙伴能够依托一个
              更可靠的建材平台开展业务。
            </p>
          </div>
          <div className="about-profile-copy">
            <p>
              我们从全球主要制造商采购高质量产品，并通过精细管理的供应链将产品引入加拿大。
            </p>
            <p>每件产品都会经过质量控制，并在分销过程中保持可追溯。</p>
            <p>
              产品通过授权本地经销商网络分销。经销商负责配送协调、客户支持、在其能力范围内
              提供的安装协助，以及售后服务。
            </p>
            <p>
              这种模式让客户既能受益于全国平台的供应能力，也能获得响应更快的本地支持。
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container">
          <div className="about-profile-section-heading narrow">
            <h2>一种不同的分销网络建设方式</h2>
            <p>
              传统分销模式往往要求经销商在开始增长前，先投入大量库存、营销、获客和运营基础设施。
            </p>
          </div>
          <div className="about-profile-statement">
            <p>
              VanStro 采用不同方式。通过集中品牌、营销、客户开发、供应链管理和运营支持，
              VanStro 承担了许多过去需要独立经销商投入大量时间、资金和资源的工作。
            </p>
            <p>
              因此，合作伙伴可以更专注于客户沟通、订单执行和本地服务支持；库存风险、营销、
              客户开发和供应链管理则由 VanStro 系统提供支持。
            </p>
            <p>
              我们认为，成功不应该建立在高投入和高风险之上，而应该建立在持续机会和可靠运营系统之上。
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel alt">
        <div className="container">
          <div className="about-profile-section-heading narrow">
            <h2>我们的不同之处</h2>
          </div>
          <div className="about-profile-apart-grid">
            {apartItems.map((item) => (
              <article className="about-profile-apart-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container about-profile-commitment">
          <h2>我们的承诺</h2>
          <ul aria-label="VanStro 承诺">
            <li>高质量</li>
            <li>有竞争力的价格</li>
            <li>贴近本地的服务</li>
          </ul>
        </div>
      </section>

      <section className="about-profile-cta">
        <div className="container about-profile-cta-grid">
          <div>
            <h2>依托可靠供应链和本地支持推进你的项目。</h2>
            <p>
              无论你正在规划项目，还是评估经销商合作机会，VanStro 都希望让建筑材料在加拿大
              更稳定、更有信心地流动。
            </p>
          </div>
          <div className="about-profile-actions">
            <Link className="button button-primary" href="/zh/contact">
              联系 VanStro
            </Link>
            <Link className="button button-secondary" href="/zh/dealers/apply">
              申请成为经销商
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
