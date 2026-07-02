import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articles } from "@/lib/data/mock-data";

export const metadata: Metadata = {
  title: "Buying guide",
  description: "VanStro buying guides for cabinets, vanities, baseboards and pickup planning."
};

export default function ArticlesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Buying guide</h1>
          <p>Helpful planning resources for homeowners, contractors and dealers.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container resource-row">
          {articles.map((article) => (
            <Link className="resource-item" href={`/articles/${article.slug}`} key={article.id}>
              <img src={article.image.url} alt={article.image.alt} />
              <span>
                <h2 className="card-title">{article.title}</h2>
                <p>{article.excerpt}</p>
                <span className="inline-link">
                  Read guide
                  <ArrowRight size={16} strokeWidth={2} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
