import type { Metadata } from "next";
import Link from "next/link";
import { SecondaryPageHero } from "@/components/layout/SecondaryPageHero";
import { PublicSubmissionForm } from "@/components/forms/PublicSubmissionForm";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "经销商申请",
  description:
    "申请成为 VanStro 经销商伙伴，提交公司资料、服务区域、运营能力和本地支持覆盖信息供审核。",
  path: "/zh/dealers/apply",
  image: "/assets/generated/dealer-program-handshake-v1.webp",
  locale: "zh_CN",
  languages: { "en-CA": "/dealers/apply", "zh-CN": "/zh/dealers/apply" }
});

const applicationSummary = [
  ["审核方式", "逐案商业审核"],
  ["适合对象", "本地建材、展厅或承包商运营商"],
  ["必需信息", "公司资料、服务区域和客户支持能力"],
  ["审核结果", "VanStro 审核后再安排后续沟通"]
];

const requiredItems = [
  "法定公司名称和主要联系人",
  "服务城市、省份和覆盖区域",
  "业务类型、展厅或工程服务运营信息",
  "可在本地协调的经销商服务",
  "当前订单、目录或产品品类重点"
];

const capabilityOptions = [
  ["customer-communication", "客户沟通"],
  ["order-execution", "订单执行"],
  ["pickup-coordination", "自提协调"],
  ["delivery-coordination", "配送协调"],
  ["after-sales-support", "售后支持"],
  ["showroom-consultation", "展厅咨询"]
];

const reviewSteps = [
  ["1", "提交资料", "提交公司、联系人、服务区域和运营信息。"],
  ["2", "覆盖审核", "VanStro 审核市场匹配度、本地覆盖和网络平衡。"],
  ["3", "政策对齐", "符合条件的候选人需确认客户交接、退换货和服务边界。"],
  ["4", "书面条款", "最终上线必须经过书面批准或协议确认。"]
];

export default function DealerApplicationZhPage() {
  return (
    <>
      <SecondaryPageHero
        breadcrumbs={[
          { label: "首页", href: "/zh/dealer-program" },
          { label: "经销商计划", href: "/zh/dealer-program" },
          { label: "经销商申请" }
        ]}
        title="经销商申请"
        className="dealer-application-hero"
        image={{
          src: "/assets/generated/dealer-program-handshake-v1.webp",
          alt: "业务伙伴讨论 VanStro 经销商申请"
        }}
        actions={
          <>
            <a className="button button-primary" href="#application-form">
              开始填写
            </a>
            <Link className="button button-secondary" href="/zh/dealer-program#fit">
              先确认匹配度
            </Link>
          </>
        }
      >
        <p>
          提交公司资料、本地覆盖和运营能力。VanStro 会先审核你的业务是否
          适合经销商计划，再讨论商业条款。
        </p>
      </SecondaryPageHero>

      <section className="page-panel dealer-application-panel">
        <div className="container dealer-application-layout">
          <PublicSubmissionForm
            className="form-panel dealer-application-form"
            id="application-form"
            kind="dealer-application"
            locale="zh-CN"
          >
            <input type="hidden" name="source" value="zh-dealer-application-page" />

            <div className="dealer-application-form-heading">
              <span>公司资料</span>
              <h2>一次性提交关键信息，我们会先审核匹配度。</h2>
              <p>
                标记为必填的字段有助于 VanStro 判断经销商计划是否能支持你的市场和运营模式。
              </p>
            </div>

            <fieldset className="dealer-application-fieldset">
              <legend>业务联系人</legend>
              <div className="form-grid two">
                <div className="field">
                  <label htmlFor="companyName">公司名称</label>
                  <input id="companyName" name="companyName" autoComplete="organization" required />
                </div>
                <div className="field">
                  <label htmlFor="contactName">联系人姓名</label>
                  <input id="contactName" name="contactName" autoComplete="name" required />
                </div>
                <div className="field">
                  <label htmlFor="email">邮箱</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="field">
                  <label htmlFor="phone">电话</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" required />
                </div>
                <div className="field">
                  <label htmlFor="website">公司网站</label>
                  <input id="website" name="website" type="url" placeholder="可选" />
                </div>
                <div className="field">
                  <label htmlFor="businessType">业务类型</label>
                  <select id="businessType" name="businessType" required defaultValue="">
                    <option value="" disabled>
                      请选择业务类型
                    </option>
                    <option value="showroom">展厅 / 设计中心</option>
                    <option value="contractor">承包商 / 工程服务商</option>
                    <option value="building-materials">建材零售商</option>
                    <option value="dealer-distributor">经销商 / 分销商</option>
                    <option value="other">其他合格本地运营商</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="dealer-application-fieldset">
              <legend>覆盖与运营</legend>
              <div className="form-grid two">
                <div className="field">
                  <label htmlFor="city">主要城市</label>
                  <input id="city" name="city" autoComplete="address-level2" required />
                </div>
                <div className="field">
                  <label htmlFor="province">省份</label>
                  <select id="province" name="province" required defaultValue="">
                    <option value="" disabled>
                      请选择省份
                    </option>
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="serviceArea">服务区域</label>
                  <input
                    id="serviceArea"
                    name="serviceArea"
                    placeholder="服务城市、区域或半径"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="productFocus">产品重点</label>
                  <input
                    id="productFocus"
                    name="productFocus"
                    placeholder="橱柜、浴室柜、线条或混合品类"
                  />
                </div>
              </div>

              <div className="dealer-application-checklist" aria-label="本地能力">
                <span>本地能力</span>
                <div>
                  {capabilityOptions.map(([value, label]) => (
                    <label key={value}>
                      <input name="capabilities" type="checkbox" value={value} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="dealer-application-fieldset">
              <legend>申请说明</legend>
              <div className="field">
                <label htmlFor="message">业务资料和补充说明</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="请说明你的公司、展厅或工程业务、本地支持团队、服务覆盖，以及你希望 VanStro 审核申请的原因。"
                  required
                />
              </div>
            </fieldset>

            <div className="dealer-application-guidance">
              <strong>提交前请确认</strong>
              <p>
                VanStro 会逐案审核经销商申请。提交本表单不保证批准、分配区域、价格、
                库存访问、线索量、上线时间或经销商关系。
              </p>
              <p>
                申请信息可用于合作审核、经销商入驻、本地覆盖评估和后续沟通。
                可参考 <Link href="/privacy">隐私政策</Link>、{" "}
                <Link href="/terms-and-conditions">条款与条件</Link> 和{" "}
                <Link href="/dealer-services-and-responsibility">经销商服务与责任</Link>。
              </p>
            </div>

            <label className="dealer-application-consent">
              <input name="applicationAcknowledgement" type="checkbox" required />
              <span>
                我理解本申请仅用于审核，最终条款必须经过 VanStro 书面批准或协议确认。
              </span>
            </label>

            <div className="dealer-application-submit-row">
              <button className="button button-primary" type="submit">
                提交申请
              </button>
              <p>符合条件的申请通常会在内部审核后收到跟进。</p>
            </div>
          </PublicSubmissionForm>

          <aside className="dealer-application-aside" aria-label="申请准备">
            <section className="dealer-application-summary">
              <h2>申请概览</h2>
              <dl>
                {applicationSummary.map(([term, description]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{description}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h2>提交前准备</h2>
              <ul>
                {requiredItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>审核路径</h2>
              <ol className="dealer-application-steps">
                {reviewSteps.map(([number, title, text]) => (
                  <li key={title}>
                    <span>{number}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="dealer-application-boundary">
              <h2>重要边界</h2>
              <p>
                除非 VanStro 书面说明，经销商提供的服务、服务价格、施工质量和本地排期
                与 VanStro 产品价格分开处理。
              </p>
              <Link href="/zh/dealer-program#policies">查看运营规则</Link>
            </section>
          </aside>
        </div>
      </section>
    </>
  );
}
