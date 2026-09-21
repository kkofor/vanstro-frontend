import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/api/server";
import { guideArticles } from "@/lib/data/mock-data";
import { ArticlePageContent } from "@/app/articles/[slug]/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guideArticles.map((article) => ({
    slug: article.slug
  }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  return buildPageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/guides/${article.slug}`,
    image: article.image.url
  });
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  return (
    <div className="guides-article">
      <ArticlePageContent slug={slug} crumb="guides" />
    </div>
  );
}
