import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageSquareText, Phone, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { ContactChatButton } from "@/components/contact/ContactChatButton";
import { PublicSubmissionForm } from "@/components/forms/PublicSubmissionForm";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "联系我们",
  description: "联系 VanStro，咨询产品、订单、经销商履约和项目支持。",
  path: "/zh/contact",
  image: "/assets/generated/contact-support-hero-v1.webp",
  locale: "zh_CN",
  languages: { "en-CA": "/contact", "zh-CN": "/zh/contact" }
});

const contactRoutes = [
  {
    title: "产品与订单问题",
    text: "咨询库存材料、订单文件、自提协调或售后对接。",
    icon: MessageSquareText
  },
  {
    title: "经销商协助履约",
    text: "常规配送、安装、本地服务和退换货问题，请优先联系负责该订单的经销商。",
    icon: Store
  },
  {
    title: "经销商计划咨询",
    text: "如果你有意加入 VanStro 经销商网络，请提交公司信息和服务区域供审核。",
    icon: UserRoundCheck
  }
];

const quickContacts = [
  {
    title: "邮件支持",
    text: "支持团队通常会在一个工作日内回复邮件咨询。",
    value: "info@vanstro.ca",
    href: "mailto:info@vanstro.ca",
    icon: Mail
  },
  {
    title: "电话支持",
    text: "适用于工作时间内较紧急的订单或经销商对接问题。",
    value: "204-505-2288",
    href: "tel:+12045052288",
    icon: Phone
  },
  {
    title: "经销商对接",
    text: "本地履约、配送协调、退换货和售后服务由分配的经销商处理。",
    value: "查看本地联系人",
    href: "#dealer-contacts",
    icon: Store
  }
];

const contactDetails = [
  {
    title: "工作日跟进",
    text: "大多数普通咨询会在一个工作日内完成分流和跟进。",
    icon: Clock3
  },
  {
    title: "服务边界",
    text: "除非 VanStro 书面说明，经销商提供的服务由授权本地经销商负责。",
    icon: ShieldCheck
  },
  {
    title: "总部位置",
    text: "VanStro Global Supply Inc. 总部位于曼尼托巴省温尼伯。",
    icon: MapPin
  }
];

const dealerContacts = [
  {
    region: "Manitoba",
    dealer: "MB01 - Yuan Construction Ltd.",
    phone: "204-505-2288",
    email: "MB01@VANSTRO.CA",
    address: "856 Century St, Winnipeg, MB R3H 0M5"
  }
];

export default function ContactZhPage() {
  return (
    <>
      <section className="page-hero contact-page-hero">
        <div className="container contact-page-hero-grid">
          <div>
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/zh/dealer-program">首页</Link>
              <span aria-hidden="true">/</span>
              <span>联系我们</span>
            </nav>
            <h1>联系 VanStro</h1>
            <p className="contact-page-lede">
              无论是产品咨询、订单支持、经销商协助履约，还是商务合作问题，
              我们会把信息转给合适的团队处理。
            </p>
            <div className="contact-page-hero-actions">
              <a className="button button-primary" href="#contact-form">
                发送信息
              </a>
              <a className="button button-secondary" href="#dealer-contacts">
                查看经销商联系人
              </a>
              <ContactChatButton variant="hero" />
            </div>
          </div>
          <figure className="contact-page-hero-visual">
            <img
              src={assetPath("/assets/generated/contact-support-hero-v1.webp")}
              alt="VanStro 支持人员协调建材订单"
              width={1774}
              height={887}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel contact-page-panel">
        <div className="container contact-page-main-grid">
          <PublicSubmissionForm
            className="form-panel form-grid two contact-page-form"
            id="contact-form"
            kind="contact"
            locale="zh-CN"
          >
            <div className="contact-page-form-heading form-wide">
              <span className="contact-page-kicker">普通咨询</span>
              <h2>把信息一次说明清楚，我们会负责分流。</h2>
              <p>
                如有订单号、产品类别、所在城市或偏好的经销商，请一起填写，方便更快处理。
              </p>
            </div>
            <div className="field">
              <label htmlFor="name">姓名</label>
              <input id="name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">邮箱</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="topic">咨询主题</label>
              <select id="topic" name="topic" required defaultValue="">
                <option value="" disabled>
                  请选择主题
                </option>
                <option value="products">产品问题</option>
                <option value="orders">订单支持</option>
                <option value="dealer-service">经销商服务对接</option>
                <option value="dealer-program">经销商计划</option>
                <option value="website-support">网站支持</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="phone">电话</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="city">城市 / 省份</label>
              <input id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="dealer">偏好的经销商</label>
              <select id="dealer" name="dealer" defaultValue="">
                <option value="">不确定 / 按位置分配</option>
                {dealerContacts.map((dealer) => (
                  <option value={dealer.dealer} key={dealer.dealer}>
                    {dealer.region} - {dealer.dealer}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="orderNumber">订单号</label>
              <input id="orderNumber" name="orderNumber" placeholder="可选" />
            </div>
            <div className="field form-wide">
              <label htmlFor="message">留言内容</label>
              <textarea
                id="message"
                name="message"
                placeholder="请说明你需要的帮助，例如产品名称、经销商位置、订单或时间要求。"
                required
              />
            </div>
            <button className="button button-primary" type="submit">
              发送信息
            </button>
          </PublicSubmissionForm>

          <aside className="contact-page-info-column" aria-label="联系信息">
            <div className="contact-page-note contact-page-quick-card">
              <span className="contact-page-kicker">适合咨询</span>
              <p>
                报价条款、订单文件、产品保修对接、经销商计划问题和网站支持。
              </p>
              <div className="contact-page-quick-list">
                <ContactChatButton />
                {quickContacts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a href={item.href} key={item.title}>
                      <Icon size={20} strokeWidth={2.2} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.value}</small>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="contact-page-detail-list">
              {contactDetails.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title}>
                    <Icon size={19} strokeWidth={2.2} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="page-panel contact-page-panel alt">
        <div className="container">
          <div className="contact-page-route-grid" aria-label="联系分流选项">
            {contactRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <article className="contact-page-route-card" key={route.title}>
                  <Icon size={22} strokeWidth={2.1} />
                  <h2>{route.title}</h2>
                  <p>{route.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-panel contact-page-panel" id="dealer-contacts">
        <div className="container contact-page-dealer-section">
          <div className="contact-page-section-heading">
            <span className="contact-page-kicker">本地经销商联系人</span>
            <h2>查找就近支持联系人</h2>
            <p>
              VanStro 产品通过授权本地经销商履约。自提、配送协调、可提供的安装服务、
              退换货和售后问题，请联系对应区域经销商。
            </p>
          </div>

          <div className="contact-page-dealer-grid">
            {dealerContacts.map((dealer) => (
              <article className="contact-page-dealer-card" key={`${dealer.region}-${dealer.dealer}`}>
                <span>{dealer.region}</span>
                <h3>{dealer.dealer}</h3>
                <div className="contact-page-dealer-list">
                  <a href={`mailto:${dealer.email}`}>
                    <Mail size={16} strokeWidth={2.2} />
                    {dealer.email}
                  </a>
                  <a href={`tel:+1${dealer.phone.replace(/\D/g, "")}`}>
                    <Phone size={16} strokeWidth={2.2} />
                    {dealer.phone}
                  </a>
                  <p>
                    <MapPin size={16} strokeWidth={2.2} />
                    {dealer.address}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
