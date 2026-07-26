"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, MapPin, PackageCheck } from "lucide-react";
import type { Banner, ProductSummary } from "@/lib/api/api-contract";
import { ProductCard } from "@/components/product/ProductCard";
import { assetPath } from "@/lib/assets";

const categoryCards = [
  {
    title: "Armoires de cuisine",
    text: "Collections d’armoires prêtes à commander",
    href: "/fr/products?category=kitchen-cabinets",
    image: assetPath("/assets/generated/category-kitchen-cabinets-v2.webp"),
    width: 5504,
    height: 3072,
    large: true
  },
  {
    title: "Meubles-lavabos",
    text: "Meubles-lavabos et solutions de rangement pour la salle de bains",
    href: "/fr/products?category=bathroom-vanities",
    image: assetPath("/assets/original-site/img-b03.gif"),
    width: 602,
    height: 292
  },
  {
    title: "Accessoires d’armoires",
    text: "Fourrures, panneaux, coups-de-pied et moulures",
    href: "/fr/products?category=kitchen-cabinets&q=Accessories",
    image: assetPath("/assets/products/kitchen-cabinets/wall-end-panel-wep1242-018930942-wep1242-ms-wh-primary.jpg"),
    width: 936,
    height: 894
  },
  {
    title: "Poignées",
    text: "Poignées et quincaillerie d’armoires",
    href: "/fr/products?category=handle-series",
    image: assetPath("/assets/generated/category-handle-series-v2.webp"),
    width: 5504,
    height: 3072
  },
  {
    title: "Plinthes et moulures",
    text: "Plinthes, cadrages et profilés",
    href: "/fr/products?category=baseboards",
    image: assetPath("/assets/original-site/img-b04.gif"),
    width: 1220,
    height: 292
  }
];

const audiencePaths = [
  {
    title: "Pour les propriétaires",
    text: "Planifiez votre espace, comparez les matériaux et confirmez les mesures avant de commander.",
    action: "Planifier votre projet",
    href: "/fr/articles",
    secondaryAction: "Ouvrir l’outil de conception 3D (EN)",
    secondaryHref: "https://tools.vanstro.ca/",
    icon: BookOpen
  },
  {
    title: "Pour les entrepreneurs",
    text: "Trouvez des armoires, des meubles-lavabos, des moulures et de la quincaillerie en stock pour vos projets en cours.",
    action: "Magasiner les matériaux",
    href: "/fr/products",
    secondaryAction: "Consulter les options de livraison",
    secondaryHref: "/fr/articles/pickup-and-delivery-options",
    icon: ClipboardList
  },
  {
    title: "Pour les détaillants locaux",
    text: "Gérez votre clientèle locale, les commandes de produits et les services offerts séparément.",
    action: "Connexion détaillant",
    href: "/fr/account/login",
    secondaryAction: "Devenir détaillant",
    secondaryHref: "/fr/dealers/apply",
    icon: PackageCheck
  }
];

export function HomePageFr({ banner, products }: { banner: Banner; products: ProductSummary[] }) {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              <span>Armoires de cuisine et matériaux résidentiels</span>{" "}
              <span>offerts dans les zones de service participantes au Canada</span>
            </h1>
            <p>Magasinez en ligne des armoires, des meubles-lavabos, des moulures et des fournitures de rénovation prêtes à commander. La disponibilité, la couverture des détaillants locaux et les options de ramassage ou de livraison varient selon le code postal.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/fr/products" prefetch={false}>
                Magasiner les produits
              </Link>
              <Link className="button button-secondary" href="/fr/dealers/map">
                Trouver un détaillant
              </Link>
            </div>
          </div>
          <div className="hero-media" aria-hidden="true">
            <img src={banner.image.url} alt="" width={banner.image.width ?? 1672} height={banner.image.height ?? 941} loading="eager" fetchPriority="high" decoding="async" />
          </div>
        </div>
      </section>

      <section className="section category-section">
        <div className="container">
          <div className="section-heading category-heading">
            <h2 className="section-title">Magasiner par catégorie</h2>
            <Link className="section-link" href="/fr/products" prefetch={false}>
              Tout voir <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="category-grid">
            {categoryCards.map((category) => (
              <Link className={category.large ? "category-card large" : "category-card"} href={category.href} prefetch={false} key={category.title}>
                <img src={category.image} alt={category.title} width={category.width} height={category.height} loading="lazy" decoding="async" />
                <div className="category-copy">
                  <h3>{category.title}</h3>
                  <p>{category.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-section">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-title">Produits populaires</h2>
            <Link className="section-link" href="/fr/products" prefetch={false}>
              Voir tous les produits <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="product-grid">
            {products.map((product) => <ProductCard product={product} locale="fr-CA" key={product.id} />)}
          </div>
        </div>
      </section>

      <section className="section audience-section" aria-labelledby="audience-paths-title-fr">
        <div className="container dealer-band audience-band">
          <div className="dealer-copy audience-copy">
            <span className="audience-eyebrow">Commencez votre projet</span>
            <h2 id="audience-paths-title-fr">Choisissez le parcours adapté à vos travaux</h2>
            <div className="audience-path-grid">
              {audiencePaths.map((path) => {
                const Icon = path.icon;
                return (
                  <article className="audience-path" key={path.title}>
                    <Icon aria-hidden="true" size={22} strokeWidth={2.1} />
                    <h3>{path.title}</h3>
                    <p>{path.text}</p>
                    <Link className="audience-primary-link" href={path.href} prefetch={false}>
                      {path.action} <ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />
                    </Link>
                    <Link className="audience-secondary-link" href={path.secondaryHref} prefetch={false}>{path.secondaryAction}</Link>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="dealer-image audience-image">
            <img src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")} alt="Produits d’armoires VanStro blanches stockés pour l’exécution locale" width={1672} height={941} loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      <section className="section store-section" id="stores">
        <div className="container store-band store-band-compact">
          <MapPin aria-hidden="true" size={42} strokeWidth={1.8} />
          <div>
            <h2>Trouver un détaillant ou une salle d’exposition</h2>
            <p>Consultez les emplacements participants pour le ramassage, la coordination de la livraison et le soutien à votre projet.</p>
          </div>
          <Link className="button button-primary" href="/fr/dealers/map">Trouver un détaillant</Link>
        </div>
      </section>
    </>
  );
}
