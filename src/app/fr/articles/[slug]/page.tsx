import type { Metadata } from "next";
import { ArticlePageContent } from "@/app/articles/[slug]/page";
import { frenchArticles } from "@/app/articles/page";
import { articles } from "@/lib/data/mock-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FrenchArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: FrenchArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((entry) => entry.slug === slug);
  const localized = frenchArticles[slug as keyof typeof frenchArticles];

  return buildPageMetadata({
    title: localized?.title ?? article?.title ?? "Guide VanStro",
    description: localized?.excerpt ?? article?.excerpt ?? "Guide d’achat VanStro.",
    path: `/fr/articles/${slug}`,
    image: article?.image.url,
    locale: "fr_CA",
    noIndex: true
  });
}

export default async function FrenchArticlePage({ params }: FrenchArticlePageProps) {
  const { slug } = await params;
  return <ArticlePageContent slug={slug} locale="fr-CA" />;
}
