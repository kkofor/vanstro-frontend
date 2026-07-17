import type { Metadata } from "next";
import Link from "next/link";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "经销商计划",
  description:
    "了解 VanStro 经销商计划，包括平台责任、经销商责任、申请审核、运营边界和相关政策要求。",
  path: "/zh/dealer-program",
  image: "/assets/generated/dealer-program-handshake-v1.webp",
  locale: "zh_CN",
  languages: { "en-CA": "/dealer-program", "zh-CN": "/zh/dealer-program" }
});

const atAGlance = [
  ["VanStro 角色", "产品供应平台、目录、结账、产品信息和经销商网络支持。"],
  ["经销商角色", "本地客户沟通、订单执行、交付协调，以及经销商自行提供的服务。"],
  ["申请状态", "逐案审核。提交申请不代表已获批准，也不代表区域、价格或线索量承诺。"],
  ["最终条款", "商业条款、上线时间和双方义务以书面批准或协议为准。"]
];

const operatingRows = [
  {
    area: "产品订单",
    vanstro: "负责目录、产品供应、产品信息、平台结账和产品政策审核。",
    dealer: "负责本地订单执行、客户沟通和产品交接。",
    customer: "客户在线浏览产品，并与分配的本地经销商处理日常事项。"
  },
  {
    area: "经销商服务",
    vanstro: "除非书面说明，不提供配送、安装、测量或装修等服务。",
    dealer: "自行设定服务范围、价格、排期、收款、施工质量和服务保修。",
    customer: "如经销商提供延伸服务，客户直接与经销商签约。"
  },
  {
    area: "退换货与支持",
    vanstro: "在适当情况下审核产品政策升级和 RMA 事项。",
    dealer: "作为配送、退换货、售后支持和日常服务的第一联系点。",
    customer: "常规支持和退货问题先联系销售该订单的本地经销商。"
  }
];

const goodFit = [
  "拥有展厅、承包商业务或本地建材经营基础",
  "有明确服务区域和面向客户的团队",
  "能够协调自提、配送或售后支持",
  "愿意遵守 VanStro 政策和信息披露规则"
];

const notFit = [
  "没有本地服务能力或客户支持能力",
  "经销商服务责任归属不清晰",
  "期望 VanStro 承担经销商服务责任",
  "要求保证线索量、收入或独家区域"
];

const reviewSteps = [
  ["1", "公司资料", "提交业务信息、服务区域、产品重点和运营能力。"],
  ["2", "覆盖审核", "VanStro 审核市场匹配度、本地覆盖能力和经销商网络平衡。"],
  ["3", "流程对齐", "符合条件的申请人需对齐订单流、客户交接、退换货和披露语言。"],
  ["4", "上线确认", "上线时间和商业条款仅通过书面批准或协议确认。"]
];

const policyRows = [
  ["经销商服务与责任", "服务责任、服务价格、客户交接和平台边界。", "/dealer-services-and-responsibility"],
  ["退换货政策", "退货路径、RMA 审核、经销商处理和升级路径。", "/return-policy"],
  ["隐私政策", "申请信息、客户转介和经销商数据共享。", "/privacy"],
  ["条款与条件", "网站使用、下单条款、允许用途和适用法律。", "/terms-and-conditions"],
  ["法律免责声明", "产品信息、图片、价格参考和非约束性网站内容。", "/legal-disclaimer"],
  ["Cookie 偏好设置", "可选功能、分析和营销 Cookie 的同意控制。", "/cookie-settings"],
  ["职业机会", "团队成长和未来区域机会。", "/careers"]
];

export default function DealerProgramZhPage() {
  return (
    <>
      <section className="page-hero dealer-program-hero dealer-program-b2b-hero">
        <div className="container dealer-program-b2b-hero-grid">
          <div>
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">首页</Link>
              <span aria-hidden="true">/</span>
              <span>经销商计划</span>
            </nav>
            <h1>经销商计划</h1>
            <p>
              面向具备本地客户沟通、订单执行和服务能力的建筑材料运营商。
              VanStro 提供平台化供货、目录、在线下单和经销商网络支持，
              本地履约由合作经销商承担。
            </p>
            <div className="dealer-program-actions">
              <Link className="button button-primary" href="/zh/dealers/apply/#application-form">
                提交经销商申请
              </Link>
              <Link className="button button-secondary" href="#fit">
                先确认是否匹配
              </Link>
            </div>
          </div>

          <figure className="dealer-program-visual dealer-program-b2b-visual">
            <img
              src={assetPath("/assets/generated/dealer-program-handshake-v1.webp")}
              alt="VanStro 经销商合作业务洽谈"
              width={1672}
              height={941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>计划概览</h2>
            <p>
              经销商计划围绕平台化产品供应和本地经销商责任来设计，
              申请前需要先理解双方边界。
            </p>
          </div>
          <aside className="dealer-program-b2b-summary" aria-label="经销商计划概览">
            <dl>
              {atAGlance.map(([term, description]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      <section className="page-panel dealer-program-panel" id="fit">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>合作资格</h2>
            <p>
              本页面面向能够承担本地客户联系和服务协调的 B2B 运营商，
              并不是普通消费者支持页面。
            </p>
          </div>
          <div className="dealer-program-b2b-qualification">
            <article>
              <h3>适合申请</h3>
              <ul>
                {goodFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>暂不适合</h3>
              <ul>
                {notFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel alt" id="model">
        <div className="container">
          <div className="dealer-program-b2b-heading wide">
            <h2>运营模式</h2>
            <p>
              VanStro 将平台产品供应与经销商本地服务分开处理。申请人、
              客户和经销商团队在开始合作前都应清楚理解这一点。
            </p>
          </div>
          <div className="dealer-program-b2b-table-wrap">
            <table className="dealer-program-b2b-table">
              <thead>
                <tr>
                  <th>范围</th>
                  <th>VanStro 平台</th>
                  <th>经销商伙伴</th>
                  <th>客户路径</th>
                </tr>
              </thead>
              <tbody>
                {operatingRows.map((row) => (
                  <tr key={row.area}>
                    <th scope="row">{row.area}</th>
                    <td>{row.vanstro}</td>
                    <td>{row.dealer}</td>
                    <td>{row.customer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dealer-program-b2b-notice">
            <strong>责任边界</strong>
            <p>
              除非 VanStro 书面说明，产品订单不包含经销商延伸服务。
              经销商服务费与 VanStro 产品价格分开，由经销商直接收取。
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>申请审核流程</h2>
            <p>
              VanStro 会审核申请人的本地覆盖、运营准备度和与现有经销商网络的匹配度。
              提交申请不代表已获批准。
            </p>
          </div>
          <ol className="dealer-program-b2b-steps">
            {reviewSteps.map(([number, title, text]) => (
              <li key={title}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-panel dealer-program-panel alt" id="policies">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>申请前需要了解的规则</h2>
            <p>
              以下页面解释潜在经销商在申请前应理解的运营规则。
              这些内容属于合作背景，不是营销材料。
            </p>
          </div>
          <div className="dealer-program-b2b-policy-list">
            {policyRows.map(([label, scope, href]) => (
              <Link href={href} key={label}>
                <span>{label}</span>
                <small>{scope}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-legal">
          <h2>重要申请说明</h2>
          <p>
            提交申请不保证批准、独家区域、价格条款、线索量、收入、
            上线时间或经销商关系。最终条款必须经过书面批准或协议确认。
          </p>
          <p>
            申请信息可用于合作审核、经销商入驻、本地覆盖评估和后续沟通。
            提交信息前，请阅读隐私政策和 Cookie 偏好设置。
          </p>
        </div>
      </section>

      <section className="dealer-program-cta dealer-program-b2b-cta">
        <div className="container dealer-program-cta-grid">
          <div>
            <h2>介绍你的市场和服务范围。</h2>
            <p>
              提交公司资料、服务区域和本地支持能力。VanStro 会审核匹配度，
              并由合适团队后续跟进。
            </p>
          </div>
          <div className="dealer-program-actions">
            <Link className="button button-primary" href="/zh/dealers/apply/#application-form">
              开始申请
            </Link>
            <Link className="button button-secondary" href="/zh/contact">
              联系经销商计划团队
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
