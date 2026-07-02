import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/api/server";
import { articles } from "@/lib/data/mock-data";

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

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `/articles/${article.slug}`
    }
  };
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
            <img src={article.image.url} alt={article.image.alt} />
          </div>
        </div>
      </section>
    </>
  );
}
