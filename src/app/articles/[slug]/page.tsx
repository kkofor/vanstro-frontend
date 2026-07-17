import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/api/server";
import { articles } from "@/lib/data/mock-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

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

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container guide-grid">
          <article>
            <p>{article.content}</p>
            <p>
              The article detail API is reserved at `/articles/{"{articleId}"}`. This page can be wired to CMS content
              without changing the route or layout.
            </p>
          </article>
          <div className="guide-image">
            <img
              src={article.image.url}
              alt={article.image.alt}
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
