import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getArticleBySlug } from "@/lib/api/server";
import { articles } from "@/lib/data/mock-data";
import { guideBodiesFr, guideSectionHeadings } from "@/lib/data/guide-bodies";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { frenchArticles } from "@/app/articles/page";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { articleSchema, serializeJsonLd } from "@/lib/seo/schema";
import { GuidesToc } from "@/components/guides/GuidesToc";
import { guideArticles } from "@/lib/data/mock-data";
import { assetPath } from "@/lib/assets";

const measureTableRows = [
  { model: "B12", width: "12\"", depth: "24\"", height: "34½\"" },
  { model: "B15", width: "15\"", depth: "24\"", height: "34½\"" },
  { model: "B18", width: "18\"", depth: "24\"", height: "34½\"" },
  { model: "B21", width: "21\"", depth: "24\"", height: "34½\"" },
  { model: "B24", width: "24\"", depth: "24\"", height: "34½\"" },
  { model: "B27", width: "27\"", depth: "24\"", height: "34½\"" },
  { model: "B30", width: "30\"", depth: "24\"", height: "34½\"" },
  { model: "B33", width: "33\"", depth: "24\"", height: "34½\"" },
  { model: "B36", width: "36\"", depth: "24\"", height: "34½\"" },
  { model: "B42", width: "42\"", depth: "24\"", height: "34½\"" }
];

const fillerTableRows = [
  { filler: "F342", width: "3\"", use: "Standard-height base and wall cabinets" },
  { filler: "F642", width: "6\"", use: "Standard-height base and wall cabinets" },
  { filler: "Tall Filler F396", width: "3\"", use: "Tall-cabinet height" },
  { filler: "Tall Filler F696", width: "6\"", use: "Tall-cabinet height" }
];

const otherGuidesOrder: Record<string, string[]> = {
  "cabinet-care": ["how-to-measure-for-cabinets", "what-finishes-are-available", "pickup-and-delivery-options", "cabinet-adjustment"],
  "cabinet-adjustment": ["how-to-measure-for-cabinets", "what-finishes-are-available", "pickup-and-delivery-options", "cabinet-care"],
  "pickup-and-delivery-options": ["how-to-measure-for-cabinets", "what-finishes-are-available", "cabinet-care", "cabinet-adjustment"],
  "how-to-measure-for-cabinets": ["what-finishes-are-available", "pickup-and-delivery-options", "cabinet-care", "cabinet-adjustment"],
  "what-finishes-are-available": ["how-to-measure-for-cabinets", "pickup-and-delivery-options", "cabinet-care", "cabinet-adjustment"]
};

// Cross-checked by the architect against three live products (base-cabinet-b12-252
// finishOptions and siblings). Visual reference only — not availability/stock data.
const SWATCH_WHITE_HEX = "#f7f6f2";
const SWATCH_LIGHT_GREY_HEX = "#c9cbc7";

const guideBodyImages: Record<
  string,
  { file: string; alt: { en: string; fr: string }; caption: { en: string; fr: string } }
> = {
  "cabinet-care": {
    file: "guide-care-cloth.png",
    alt: {
      en: "Wiping a white matte cabinet door with a soft cloth",
      fr: "Nettoyage d'une porte d'armoire blanche mate avec un chiffon doux"
    },
    caption: {
      en: "Use a slightly damp cloth on the door face. Do not spray cleaner onto the cabinet.",
      fr: "Utilisez un chiffon légèrement humide sur la face de la porte. Ne vaporisez pas de nettoyant directement sur l'armoire."
    }
  },
  "cabinet-adjustment": {
    file: "guide-adjust-hinge.png",
    alt: {
      en: "Concealed six-way hinge on a slightly open cabinet door",
      fr: "Charnière invisible six voies sur une porte d'armoire légèrement ouverte"
    },
    caption: {
      en: "The hinge can correct small movement after settling. If you are unsure, ask your dealer before adjusting it.",
      fr: "La charnière peut corriger un léger mouvement après le tassement. En cas de doute, consultez votre détaillant avant de la régler."
    }
  },
  "how-to-measure-for-cabinets": {
    file: "guide-measure-wall.png",
    alt: {
      en: "Measuring a kitchen wall beside a run of base cabinets",
      fr: "Mesure d'un mur de cuisine à côté d'une rangée d'armoires de base"
    },
    caption: {
      en: "Measure each wall before you add cabinet widths. The leftover space is what a filler has to close.",
      fr: "Mesurez chaque mur avant d'additionner les largeurs d'armoires. L'espace restant est ce qu'un fileur doit combler."
    }
  },
  "pickup-and-delivery-options": {
    file: "guide-pickup-boxes.png",
    alt: {
      en: "Cabinet cartons prepared for dealer pickup",
      fr: "Cartons d'armoires préparés pour le ramassage chez le détaillant"
    },
    caption: {
      en: "Pickup timing and delivery charges are confirmed by the local dealer after the order is placed.",
      fr: "Le moment du ramassage et les frais de livraison sont confirmés par le détaillant local après le passage de la commande."
    }
  },
  "what-finishes-are-available": {
    file: "guide-finish-doors.png",
    alt: {
      en: "White and light grey Shaker cabinet door samples",
      fr: "Échantillons de portes d'armoires Shaker blanches et gris pâle"
    },
    caption: {
      en: "White and Light Grey are the published cabinet colours. Confirm a match with a physical sample, not a screen.",
      fr: "Le blanc et le gris pâle sont les couleurs d'armoires publiées. Confirmez la correspondance avec un échantillon physique, non à l'écran."
    }
  }
};

function GuideBodyFigure({ slug, french }: { slug: string; french: boolean }) {
  const image = guideBodyImages[slug];
  if (!image) return null;
  return (
    <figure>
      <img
        src={assetPath(`/assets/guides/${image.file}`)}
        alt={french ? image.alt.fr : image.alt.en}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
      />
      <figcaption>{french ? image.caption.fr : image.caption.en}</figcaption>
    </figure>
  );
}

const danglingLead =
  /^(It|This|That|These|Those|They|Cela|Ceci|Ils|Elles|Il |Elle |Ceux|Celles)\b/i;

function kebabGuideHeading(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type GuideSection = {
  id: string;
  heading: string;
  leadParagraph: string;
  paragraphs: string[];
};

function parseGuideParagraphs(content: string, headings: string[], idHeadings: string[]) {
  const leadParagraphs: string[] = [];
  const sections: GuideSection[] = [];
  let currentSection: GuideSection | null = null;

  content.split("\n\n").forEach((paragraph) => {
    const headingIndex = headings.findIndex((item) => paragraph.startsWith(`${item}.`));
    if (headingIndex === -1) {
      if (currentSection) {
        currentSection.paragraphs.push(paragraph);
      } else {
        leadParagraphs.push(paragraph);
      }
      return;
    }
    const heading = headings[headingIndex];
    const rest = paragraph.slice(heading.length).replace(/^\.\s*/, "").trimStart();
    if (!rest || danglingLead.test(rest)) {
      if (currentSection) {
        currentSection.paragraphs.push(paragraph);
      } else {
        leadParagraphs.push(paragraph);
      }
      return;
    }
    currentSection = {
      id: `${kebabGuideHeading(idHeadings[headingIndex])}-title`,
      heading,
      leadParagraph: rest,
      paragraphs: []
    };
    sections.push(currentSection);
  });

  return { leadParagraphs, sections };
}

const frenchArticleContent: Record<string, string> = {
  "what-finishes-are-available": "Vérifiez la couleur, le matériau et le fini indiqués pour le numéro de modèle exact avant de commander. Les images peuvent différer en raison de l’éclairage, des réglages de l’écran et des variations normales de fabrication.\n\nCommandez ou examinez un échantillon physique lorsqu’une correspondance exacte des couleurs est importante. Demandez à votre détaillant local les consignes d’entretien, la préparation requise avant la peinture et la compatibilité avec les armoires, les moulures et la quincaillerie environnantes.",
  ...guideBodiesFr
};

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  return buildPageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/articles/${article.slug}`,
    image: article.image.url,
    noIndex: true
  });
}

export async function ArticlePageContent({
  slug,
  locale = "en-CA",
  crumb
}: {
  slug: string;
  locale?: SiteLocale;
  crumb?: "guides";
}) {
  // Keep article retrieval behind this boundary for the future CMS detail API at
  // /articles/{articleId}; the public route and page layout should not need to change.
  const article = await getArticleBySlug(slug);
  const localized = locale === "fr-CA" ? frenchArticles[slug as keyof typeof frenchArticles] : undefined;
  const content = locale === "fr-CA" ? frenchArticleContent[slug] ?? article.content : article.content;
  const title = localized?.title ?? article.title;
  const excerpt = localized?.excerpt ?? article.excerpt;
  const french = locale === "fr-CA";
  const articleLd =
    crumb === "guides"
      ? articleSchema({
          title,
          description: excerpt,
          path: locale === "fr-CA" ? `/fr/guides/${slug}` : `/guides/${slug}`,
          image: article.image.url,
          datePublished: article.publishedAt,
          dateModified: "2026-09-10T12:00:00.000Z",
          inLanguage: locale === "fr-CA" ? "fr-CA" : "en-CA"
        })
      : null;

  let tocItems: { id: string; heading: string }[] = [];
  let leadParagraphs: string[] = [];
  let sections: GuideSection[] = [];
  const sectionExtras: Record<string, ReactNode> = {};

  if (crumb === "guides") {
    const enHeadings = guideSectionHeadings[slug]?.en ?? [];
    const headings = french ? guideSectionHeadings[slug]?.fr ?? [] : enHeadings;
    const parsed = parseGuideParagraphs(content, headings, enHeadings);
    leadParagraphs = parsed.leadParagraphs;
    sections = parsed.sections;
    tocItems = sections.map((section) => ({ id: section.id, heading: section.heading }));

    if (slug === "how-to-measure-for-cabinets") {
      const modelHeaders = french
        ? { model: "Modèle #", width: "Largeur", depth: "Profondeur", height: "Hauteur" }
        : { model: "Model #", width: "Width", depth: "Depth", height: "Height" };
      const fillerHeaders = french
        ? { filler: "Fileur", width: "Largeur", use: "Utilisation en hauteur" }
        : { filler: "Filler", width: "Width", use: "Height use" };
      const incrementsId = `${kebabGuideHeading(enHeadings[0] ?? "")}-title`;
      const fillersId = `${kebabGuideHeading(enHeadings[1] ?? "")}-title`;
      sectionExtras[incrementsId] = (
        <table className="guide-table">
          <caption className="visually-hidden">
            {french ? "Largeurs publiées des armoires de base VanStro" : "Published VanStro base cabinet widths"}
          </caption>
          <thead>
            <tr>
              <th>{modelHeaders.model}</th>
              <th>{modelHeaders.width}</th>
              <th>{modelHeaders.depth}</th>
              <th>{modelHeaders.height}</th>
            </tr>
          </thead>
          <tbody>
            {measureTableRows.map((row) => (
              <tr key={row.model}>
                <td>{row.model}</td>
                <td>{row.width}</td>
                <td>{row.depth}</td>
                <td>{row.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      sectionExtras[fillersId] = (
        <table className="guide-table">
          <caption className="visually-hidden">
            {french ? "Largeurs publiées des fileurs VanStro" : "Published VanStro filler widths"}
          </caption>
          <thead>
            <tr>
              <th>{fillerHeaders.filler}</th>
              <th>{fillerHeaders.width}</th>
              <th>{fillerHeaders.use}</th>
            </tr>
          </thead>
          <tbody>
            {fillerTableRows.map((row) => (
              <tr key={row.filler}>
                <td>{row.filler}</td>
                <td>{row.width}</td>
                <td>{row.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (slug === "what-finishes-are-available") {
      // Colour values cross-checked by the architect against three live products
      // (base-cabinet-b12-252 finishOptions). Visual reference swatches only — no
      // availability/stock wording is rendered here.
      const coloursId = `${kebabGuideHeading(enHeadings[0] ?? "")}-title`;
      sectionExtras[coloursId] = (
        <div className="swatches" aria-hidden="true">
          <div className="swatch swatch-white" style={{ background: SWATCH_WHITE_HEX }}>
            {french ? "Blanc" : "White"}
          </div>
          <div className="swatch swatch-grey" style={{ background: SWATCH_LIGHT_GREY_HEX }}>
            {french ? "Gris pâle" : "Light Grey"}
          </div>
        </div>
      );
    }
  }

  const otherGuideSlugs = crumb === "guides" ? otherGuidesOrder[slug] ?? [] : [];
  const otherGuides = otherGuideSlugs.map((otherSlug) => {
    const summary = guideArticles.find((entry) => entry.slug === otherSlug);
    const otherLocalized = french ? frenchArticles[otherSlug as keyof typeof frenchArticles] : undefined;
    return {
      slug: otherSlug,
      title: otherLocalized?.title ?? summary?.title ?? otherSlug
    };
  });

  return (
    <>
      {articleLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }}
        />
      ) : null}
      {crumb === "guides" ? (
        <>
          <section className="page-hero unified-content-hero">
            <div className="container unified-content-hero-grid">
              <PageBreadcrumb
                className="unified-content-hero-breadcrumb"
                items={[
                  { label: locale === "fr-CA" ? "Accueil" : "Home", href: localeHref("/", locale) },
                  { label: "Guides", href: localeHref("/guides", locale) },
                  { label: title }
                ]}
              />
              <div className="unified-content-hero-copy">
                <h1>{title}</h1>
                <p>{excerpt}</p>
              </div>
              <figure className="secondary-page-hero-visual">
                <img
                  src={article.image.url}
                  alt={localized?.imageAlt ?? article.image.alt}
                  width={1600}
                  height={900}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </figure>
            </div>
          </section>
          <section className="page-panel">
            <div className="container">
              <div className="guides-article-grid">
                <GuidesToc
                  items={tocItems}
                  label={french ? "Sur cette page" : "On this page"}
                  mobileLabel={french ? "Sur cette page" : "On this page"}
                />
                <div className="guides-article-body">
                  <article>
                    {leadParagraphs.map((paragraph, index) => (
                      <p key={`lead-${index}`}>{paragraph}</p>
                    ))}
                    {slug === "how-to-measure-for-cabinets" ? <GuideBodyFigure slug={slug} french={french} /> : null}
                    {sections.map((section, sectionIndex) => (
                      <section key={section.id} className="guides-article-section" aria-labelledby={section.id}>
                        <h2 id={section.id}>{section.heading}</h2>
                        <p>{section.leadParagraph}</p>
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                        {sectionExtras[section.id] ?? null}
                        {sectionIndex === 0 && slug !== "how-to-measure-for-cabinets" ? (
                          <GuideBodyFigure slug={slug} french={french} />
                        ) : null}
                      </section>
                    ))}
                  </article>
                  <section className="more" aria-labelledby="more-title">
                    <h2 id="more-title">{french ? "Autres guides" : "Other guides"}</h2>
                    <ul className="more-list">
                      {otherGuides.map((guide) => (
                        <li key={guide.slug}>
                          <Link href={localeHref(`/guides/${guide.slug}`, locale)}>
                            <strong>{guide.title}</strong>
                            <span>{french ? "Lire le guide" : "Read guide"}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p className="guides-article-back">
                      <Link href={localeHref("/guides", locale)}>
                        {locale === "fr-CA" ? "Retour aux Guides" : "Back to Guides"}
                      </Link>
                    </p>
                  </section>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="page-hero">
            <div className="container">
              <h1>{localized?.title ?? article.title}</h1>
              <p>{localized?.excerpt ?? article.excerpt}</p>
            </div>
          </section>
          <section className="page-panel">
            <div className="container guide-grid">
              <article>
                {content.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
              <div className="guide-image">
                <img
                  src={article.image.url}
                  alt={localized?.imageAlt ?? article.image.alt}
                  width={article.image.width ?? 614}
                  height={article.image.height ?? 909}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticlePageContent slug={slug} />;
}
