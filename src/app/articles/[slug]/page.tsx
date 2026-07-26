import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/api/server";
import { articles } from "@/lib/data/mock-data";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { frenchArticles } from "@/app/articles/page";
import type { SiteLocale } from "@/lib/i18n/locale";

const frenchArticleContent: Record<string, string> = {
  "how-to-measure-for-cabinets": "Mesurez chaque mur d’un coin à l’autre et notez la hauteur du plafond à plusieurs endroits. Indiquez les portes, les fenêtres, les électroménagers, la plomberie, les prises électriques et tout obstacle pouvant influencer l’emplacement des armoires.\n\nUtilisez les dimensions publiées pour chaque numéro de modèle au moment de planifier l’aménagement. Prévoyez de l’espace pour les fileurs, le dégagement des portes et des tiroirs, la ventilation des électroménagers et les murs irréguliers. Confirmez les mesures finales et les exigences d’installation auprès de votre détaillant local avant de commander.",
  "what-finishes-are-available": "Vérifiez la couleur, le matériau et le fini indiqués pour le numéro de modèle exact avant de commander. Les images peuvent différer en raison de l’éclairage, des réglages de l’écran et des variations normales de fabrication.\n\nCommandez ou examinez un échantillon physique lorsqu’une correspondance exacte des couleurs est importante. Demandez à votre détaillant local les consignes d’entretien, la préparation requise avant la peinture et la compatibilité avec les armoires, les moulures et la quincaillerie environnantes.",
  "pickup-and-delivery-options": "La commande en ligne est offerte dans les zones de service participantes au Canada. La disponibilité des produits, la couverture des détaillants locaux et les options de ramassage et de livraison varient selon le code postal. Le détaillant local sélectionné confirme les stocks et le mode d’exécution offert pour votre commande.\n\nLes délais de ramassage et de livraison, les frais de livraison et les exigences du lieu sont confirmés après la commande. La livraison à domicile, la livraison à l’intérieur, le déchargement, l’installation et les autres services sur place sont inclus uniquement lorsqu’ils figurent expressément dans les documents de commande ou font l’objet d’une entente distincte avec le détaillant local.\n\nAu moment de la remise, vérifiez la quantité, les articles reçus et les dommages visibles. Notez les problèmes visibles sur le document de livraison lorsque cela est possible et communiquez rapidement avec votre détaillant local. La signature de l’accusé de réception ne vous empêche pas de signaler un dommage caché qui ne pouvait raisonnablement être constaté lors de l’inspection initiale."
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

export async function ArticlePageContent({ slug, locale = "en-CA" }: { slug: string; locale?: SiteLocale }) {
  // Keep article retrieval behind this boundary for the future CMS detail API at
  // /articles/{articleId}; the public route and page layout should not need to change.
  const article = await getArticleBySlug(slug);
  const localized = locale === "fr-CA" ? frenchArticles[slug as keyof typeof frenchArticles] : undefined;
  const content = locale === "fr-CA" ? frenchArticleContent[slug] ?? article.content : article.content;

  return (
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
  );
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticlePageContent slug={slug} />;
}
