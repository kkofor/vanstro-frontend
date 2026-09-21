import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, BookOpen, ExternalLink, FileCheck2, FileText, ShieldCheck, Wrench } from "lucide-react";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { resourceCategories, resourceDocuments } from "@/content/resources";
import { assetPath } from "@/lib/assets";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Download center",
  description: "Download VanStro product catalogs, installation guides and warranty documents.",
  path: "/articles",
  image: "/assets/resource-gallery.png"
});

const categoryIcons = { catalog: BookOpen, installation: Wrench, warranty: ShieldCheck };
const frenchCategories = {
  catalog: { title: "Catalogues de produits", description: "Consultez les familles de produits, les dimensions et les configurations actuellement offertes." },
  installation: { title: "Guides d’installation", description: "Trouvez le guide correspondant à l’UGS indiquée sur la page du produit ou sur votre commande." },
  warranty: { title: "Renseignements sur la garantie", description: "Consultez la couverture, les exclusions et les exigences de réclamation avant l’installation." }
};
const frenchDocuments: Record<string, { title: string; description: string; appliesTo?: string }> = {
  "cabinet-catalog-2026": { title: "Catalogue des armoires — été 2026", description: "Catalogue des armoires de cuisine et des meubles-lavabos VanStro.", appliesTo: "Armoires de cuisine et meubles-lavabos" },
  "trim-catalog-2026": { title: "Catalogue des plinthes, cadrages et moulures — printemps 2026", description: "Profils et renseignements sur les produits de finition intérieure VanStro.", appliesTo: "Plinthes, cadrages et moulures" },
  "pvc-wall-panel-finishes-part-1": { title: "AG4-1PVC Finish_V2026-1_0", description: "Échantillons de finis à film métallique pour panneaux muraux en PVC VanStro.", appliesTo: "Panneaux muraux en PVC" },
  "pvc-wall-panel-finishes-part-2": { title: "AG4-2PVC Finish_V2026-1_0", description: "Échantillons de finis à grain de bois pour panneaux muraux en PVC VanStro.", appliesTo: "Panneaux muraux en PVC" },
  "pvc-wall-panel-finishes-part-3": { title: "AG4-3PVC Finish_V2026-1_2", description: "Échantillons de finis aspect pierre pour panneaux muraux en PVC VanStro.", appliesTo: "Panneaux muraux en PVC" },
  "pvc-wall-panel-finishes-part-4": { title: "AG4-4PVC Finish_V2026-1_2", description: "Échantillons supplémentaires de finis à grain de bois avec codes de couleur.", appliesTo: "Panneaux muraux en PVC" },
  "fluted-wall-panel-catalog-v2026-1-0": { title: "Vanstro-Fluted-Wall-Panel-Catalog-V2026-1-0", description: "Catalogue des panneaux muraux cannelés VanStro.", appliesTo: "Panneaux muraux cannelés" },
  "vanity-install-vs24-vs27-vs30": { title: "Guide d’installation — VS24, VS27 et VS30", description: "Instructions d’assemblage et d’installation pour les familles de meubles-lavabos à deux portes indiquées." },
  "vanity-install-v3021stdr": { title: "Guide d’installation — V3021STDR", description: "Instructions pour la famille à une porte à droite et deux tiroirs." },
  "vanity-install-v3021stdl": { title: "Guide d’installation — V3021STDL", description: "Instructions pour la famille à une porte à gauche et deux tiroirs." },
  "vanity-install-v3021tdr-v3621tdr": { title: "Guide d’installation — V3021TDR et V3621TDR", description: "Instructions pour les familles à deux portes à droite et deux tiroirs." },
  "vanity-install-v3021tdl-v3621tdl": { title: "Guide d’installation — V3021TDL et V3621TDL", description: "Instructions pour les familles à deux portes à gauche et deux tiroirs." },
  "vanity-install-vs36": { title: "Guide d’installation — VS36", description: "Instructions pour la famille de meubles-lavabos de 36 pouces à deux portes." },
  "vanity-install-v4221-v4821": { title: "Guide d’installation — V4221 et V4821", description: "Instructions pour les familles à deux portes et six tiroirs." },
  "vanity-install-v6621": { title: "Guide d’installation — UGS 026621711–714", description: "Instructions pour la famille à quatre portes et trois tiroirs indiquée." },
  "cabinet-vanity-warranty-2026": { title: "Garantie limitée de 12 mois sur les armoires et meubles-lavabos — 2026", description: "Conditions, exclusions et exigences de réclamation de la garantie limitée actuelle.", appliesTo: "Armoires de cuisine et meubles-lavabos admissibles" }
};
export const frenchArticles = {
  "how-to-measure-for-cabinets": { title: "Prise de mesures pour armoires", excerpt: "Largeurs, hauteurs, dégagements et fileurs d'armoires.", imageAlt: "Planification du rangement et des armoires de cuisine" },
  "what-finishes-are-available": { title: "Finis offerts", excerpt: "Finis d'armoires blanc et gris pâle, matériaux de moulure apprêtés et notes d'entretien.", imageAlt: "Matériaux de finition pour armoires" },
  "pickup-and-delivery-options": { title: "Options de livraison et de ramassage chez un détaillant local", excerpt: "La disponibilité, le ramassage et la livraison dépendent de votre détaillant et de votre code postal.", imageAlt: "Matériaux résidentiels préparés pour le ramassage" },
  "cabinet-care": { title: "Entretien des armoires", excerpt: "Comment nettoyer les portes à fini PVC doux au toucher, les caissons en mélamine et les moulures prêtes à peindre.", imageAlt: "Fini et entretien des portes d’armoire" },
  "cabinet-adjustment": { title: "Réglage des portes et tiroirs", excerpt: "Quand régler une porte ou un tiroir, quoi vérifier d’abord, et quand communiquer avec votre détaillant local.", imageAlt: "Alignement des portes et des tiroirs" }
} as const;

export function ArticlesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return <div className="resource-center-page">
    <header className="resource-center-hero unified-content-hero"><div className="container resource-center-hero-layout unified-content-hero-grid">
      <PageBreadcrumb className="unified-content-hero-breadcrumb" items={[{ label: french ? "Accueil" : "Home", href: localeHref("/", locale) }, { label: french ? "Centre de téléchargement" : "Download center" }]} />
      <div className="unified-content-hero-copy"><h1>{french ? "Centre de téléchargement" : "Download center"}</h1><p>{french ? "Téléchargez les catalogues, les guides d’installation propres aux produits et les renseignements sur la garantie. Utilisez l’UGS de votre produit ou de votre commande pour choisir le bon document." : "Download current VanStro catalogs, product-specific installation guides and warranty information. Use the SKU on your product page or order to select the right document."}</p><div className="resource-center-hero-actions"><a className="button button-primary" href="#documents">{french ? "Parcourir les documents" : "Browse documents"}<ArrowDownToLine size={17} aria-hidden="true" /></a></div></div>
      <aside className="resource-center-summary" aria-label={french ? "Résumé des ressources offertes" : "Available resource summary"}><FileCheck2 size={28} aria-hidden="true" /><strong>{resourceDocuments.length} {french ? "documents PDF disponibles" : "available PDF documents"}</strong><span>{french ? "Accès libre · aucun compte requis" : "Open access · no account required"}</span><dl>{resourceCategories.map((category) => <div key={category.id}><dt>{french ? frenchCategories[category.id].title : category.title}</dt><dd>{resourceDocuments.filter((document) => document.category === category.id).length}</dd></div>)}</dl></aside>
    </div></header>

    <section className="resource-center-documents" id="documents" aria-labelledby="documents-title"><div className="container"><div className="resource-center-section-heading"><div><h2 id="documents-title">{french ? "Documents sur les produits" : "Product Documents"}</h2><p>{french ? "Les fichiers PDF sont hébergés localement afin de demeurer accessibles avec la boutique." : "PDF files are hosted locally so they remain available with the storefront."}</p></div></div><div className="resource-category-stack">
      {resourceCategories.map((category) => { const Icon = categoryIcons[category.id]; const documents = resourceDocuments.filter((document) => document.category === category.id); const localizedCategory = french ? frenchCategories[category.id] : category; return <section className="resource-category" id={category.id} key={category.id}><div className="resource-category-heading"><span className="resource-category-icon" aria-hidden="true"><Icon size={22} /></span><div><h3>{localizedCategory.title}</h3><p>{localizedCategory.description}</p></div><span>{documents.length} {french ? (documents.length === 1 ? "fichier" : "fichiers") : (documents.length === 1 ? "file" : "files")}</span></div><div className="resource-document-list">{documents.map((document) => { const localized = french ? frenchDocuments[document.id] : undefined; const title = localized?.title ?? document.title; return <article className="resource-document" id={`resource-${document.id}`} key={document.id}><div className="resource-document-type" aria-hidden="true"><FileText size={21} /><span>PDF</span></div><div className="resource-document-copy"><h4>{title}</h4><p>{localized?.description ?? document.description}</p>{document.appliesTo ? <strong>{french ? "S’applique à" : "Applies to"}: {localized?.appliesTo ?? document.appliesTo}</strong> : null}<small>{document.language} · {document.pages} pages · {document.fileSize}</small></div><div className="resource-document-actions"><a href={assetPath(document.href)} target="_blank" rel="noreferrer">{french ? "Voir le PDF" : "View PDF"}<span className="sr-only">: {title} ({french ? "s’ouvre dans un nouvel onglet" : "opens in a new tab"})</span><ExternalLink size={15} aria-hidden="true" /></a><a href={assetPath(document.href)} download>{french ? "Télécharger" : "Download"}<span className="sr-only">: {title}</span><ArrowDownToLine size={15} aria-hidden="true" /></a></div></article>; })}</div></section>; })}
    </div></div></section>

    <section className="resource-center-note"><div className="container resource-center-note-inner"><div><h2>{french ? "Avant l’installation" : "Before You Install"}</h2><p>{french ? "Faites correspondre le guide à l’UGS exacte figurant sur le produit ou la commande. Confirmez les conditions du site, la plomberie, l’électricité, l’ancrage mural, les dégagements et les exigences des codes locaux avec une personne qualifiée. Les catalogues ne remplacent pas les instructions d’installation. Si le nombre de pièces ou une instruction semble incohérent, arrêtez l’assemblage et communiquez avec le soutien VanStro." : "Match the guide to the exact SKU on your product or order. Confirm site conditions, plumbing, electrical requirements, wall anchoring, clearances and local code requirements with a qualified installer. Product catalogs do not replace installation instructions. If a parts count or instruction appears inconsistent, stop and contact VanStro support before assembly."}</p></div><Link className="button button-secondary" href={localeHref("/contact", locale)}>{french ? "Communiquer avec le soutien VanStro" : "Contact VanStro support"}</Link></div></section>
  </div>;
}

export default function ArticlesPage() { return <ArticlesPageContent />; }
