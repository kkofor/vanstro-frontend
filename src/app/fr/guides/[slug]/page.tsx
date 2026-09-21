import type { Metadata } from "next";
import { ArticlePageContent } from "@/app/articles/[slug]/page";
import { frenchArticles } from "@/app/articles/page";
import { guideArticles } from "@/lib/data/mock-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FrenchGuidePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guideArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: FrenchGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = guideArticles.find((entry) => entry.slug === slug);
  const localized = frenchArticles[slug as keyof typeof frenchArticles];

  return buildPageMetadata({
    title: localized?.title ?? article?.title ?? "Guide VanStro",
    description: localized?.excerpt ?? article?.excerpt ?? "Guide d'achat VanStro.",
    path: `/fr/guides/${slug}`,
    image: article?.image.url,
    locale: "fr_CA"
  });
}

export default async function FrenchGuidePage({ params }: FrenchGuidePageProps) {
  const { slug } = await params;
  return (
    <div className="guides-article">
      <ArticlePageContent slug={slug} locale="fr-CA" crumb="guides" />
    </div>
  );
}
