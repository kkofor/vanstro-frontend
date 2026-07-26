import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articles } from "@/lib/data/mock-data";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";

export const frenchArticles = {
  "how-to-measure-for-cabinets": {
    title: "Comment mesurer l’espace pour des armoires?",
    excerpt: "Un guide pratique pour planifier les largeurs, les hauteurs, les dégagements et les fileurs.",
    imageAlt: "Planification du rangement et des armoires de cuisine"
  },
  "what-finishes-are-available": {
    title: "Finis blancs pour armoires et moulures apprêtées",
    excerpt: "Examinez les finis blancs, les moulures apprêtées et les conseils d’entretien avant de commencer votre commande.",
    imageAlt: "Matériaux de finition pour armoires"
  },
  "pickup-and-delivery-options": {
    title: "Options de livraison et de ramassage chez un détaillant local",
    excerpt: "Découvrez comment la disponibilité et les options de ramassage et de livraison sont confirmées selon votre code postal.",
    imageAlt: "Matériaux résidentiels préparés pour le ramassage"
  }
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Buying guide",
  description: "VanStro buying guides for cabinets, vanities, baseboards and pickup planning.",
  path: "/articles",
  image: "/assets/resource-gallery.png"
});

export function ArticlesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Guides d’achat" : "Buying guide"}</h1>
          <p>{french ? "Des ressources pratiques pour les propriétaires, les entrepreneurs et les détaillants." : "Helpful planning resources for homeowners, contractors and dealers."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container resource-row">
          {articles.map((article) => {
            const localized = french ? frenchArticles[article.slug as keyof typeof frenchArticles] : undefined;
            return (
            <Link className="resource-item" href={localeHref(`/articles/${article.slug}`, locale)} key={article.id}>
              <img
                src={article.image.url}
                alt={localized?.imageAlt ?? article.image.alt}
                width={article.image.width ?? 614}
                height={article.image.height ?? 909}
                loading="lazy"
                decoding="async"
              />
              <span>
                <h2 className="card-title">{localized?.title ?? article.title}</h2>
                <p>{localized?.excerpt ?? article.excerpt}</p>
                <span className="inline-link">
                  {french ? "Lire le guide" : "Read guide"}
                  <ArrowRight size={16} strokeWidth={2} />
                </span>
              </span>
            </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default function ArticlesPage() {
  return <ArticlesPageContent />;
}
