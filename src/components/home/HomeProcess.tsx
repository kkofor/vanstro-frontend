"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";

export type AudienceRole = "homeowner" | "contractor" | "dealer";

type Step = {
  index: string;
  role: string;
  title: string;
  text: string;
  link?: { label: string; href: string };
};

function stepsFor(role: AudienceRole, locale: SiteLocale): Step[] {
  const french = locale === "fr-CA";
  const map = localeHref("/dealers/map/", locale);
  const catalog = canonicalCatalogUrl(locale);
  const articles = localeHref("/articles/", locale);
  const pickup = localeHref("/guides/pickup-and-delivery-options/", locale);
  const apply = localeHref("/dealers/apply/", locale);
  const login = localeHref("/dealer-access/", locale);
  if (role === "contractor") {
    return french
      ? [
          { index: "01", role: "VOUS", title: "Trouver un détaillant local", text: "Repérez le détaillant participant qui peut servir le chantier.", link: { label: "Trouver un détaillant", href: map } },
          { index: "02", role: "VOUS", title: "Télécharger les plans", text: "Récupérez les dessins et documents du centre de ressources.", link: { label: "Centre de ressources", href: articles } },
          { index: "03", role: "VOUS", title: "Commander pour le chantier", text: "Magasinez le catalogue au prix national affiché.", link: { label: "Magasiner les produits", href: catalog } },
          { index: "04", role: "ENSEMBLE", title: "Ramassage pour le chantier", text: "Le détaillant confirme le ramassage ou la livraison pour le job.", link: { label: "Ramassage et livraison", href: pickup } }
        ]
      : [
          { index: "01", role: "YOU", title: "Find a local dealer", text: "See which participating dealer can serve the job site.", link: { label: "Find a dealer", href: map } },
          { index: "02", role: "YOU", title: "Download drawings", text: "Get drawings and documents from the Resource Centre.", link: { label: "Resource Centre", href: articles } },
          { index: "03", role: "YOU", title: "Order for the job", text: "Shop the catalog at the listed national price.", link: { label: "Shop products", href: catalog } },
          { index: "04", role: "TOGETHER", title: "Pickup for the job", text: "The dealer confirms pickup or delivery for that order.", link: { label: "Pickup & delivery options", href: pickup } }
        ];
  }
  if (role === "dealer") {
    return french
      ? [
          { index: "01", role: "VOUS", title: "Devenir détaillant", text: "Présentez une demande pour participer au programme VanStro.", link: { label: "Postuler", href: apply } },
          { index: "02", role: "VOUS", title: "Portail détaillant", text: "Ouvrez le portail partenaire pour gérer commandes et clients locaux.", link: { label: "Ouvrir le portail", href: login } },
          { index: "03", role: "VOUS", title: "Design Studio", text: "Utilisez les outils de conception du détaillant pour les aménagements destinés à vos clients locaux.", link: { label: "Ouvrir Design Studio", href: "https://tools.vanstro.ca/" } },
          { index: "04", role: "ENSEMBLE", title: "Exécution locale", text: "Confirmez le ramassage ou la livraison avec le propriétaire pour cette commande.", link: { label: "Ramassage et livraison", href: pickup } }
        ]
      : [
          { index: "01", role: "YOU", title: "Become a dealer", text: "Apply to join the VanStro dealer program.", link: { label: "Apply now", href: apply } },
          { index: "02", role: "YOU", title: "Dealer Portal", text: "Open the partner portal to manage orders and local customers.", link: { label: "Open the portal", href: login } },
          { index: "03", role: "YOU", title: "Design Studio", text: "Use the dealer design tools for layouts you prepare for local customers.", link: { label: "Open Design Studio", href: "https://tools.vanstro.ca/" } },
          { index: "04", role: "TOGETHER", title: "Fulfill locally", text: "Confirm pickup or delivery with the homeowner for that order.", link: { label: "Pickup & delivery options", href: pickup } }
        ];
  }
  return french
    ? [
        { index: "01", role: "VOUS", title: "Vérifiez votre code postal", text: "Voyez quel détaillant participant peut exécuter la commande dans votre secteur.", link: { label: "Trouver un détaillant", href: localeHref("/dealers/map/", locale) } },
        { index: "02", role: "VOUS", title: "Commandez en ligne", text: "Magasinez le catalogue au prix national affiché.", link: { label: "Magasiner les produits", href: canonicalCatalogUrl(locale) } },
        { index: "03", role: "VOTRE DÉTAILLANT", title: "Le détaillant confirme", text: "Il confirme les stocks, le ramassage et la livraison pour cette commande.", link: { label: "Trouver un détaillant", href: localeHref("/dealers/map/", locale) } },
        { index: "04", role: "ENSEMBLE", title: "Ramassage ou livraison", text: "Récupérez en salle d’exposition ou faites livrer par ce détaillant.", link: { label: "Ramassage et livraison", href: localeHref("/guides/pickup-and-delivery-options/", locale) } }
      ]
    : [
        { index: "01", role: "YOU", title: "Check your postal code", text: "See which participating dealer can fulfill your order in your area.", link: { label: "Find a dealer", href: "/dealers/map/" } },
        { index: "02", role: "YOU", title: "Order online", text: "Shop the catalog at the listed national price.", link: { label: "Shop products", href: canonicalCatalogUrl(locale) } },
        { index: "03", role: "YOUR DEALER", title: "Dealer confirms", text: "Your local dealer confirms stock, pickup and delivery for that order.", link: { label: "Find a dealer", href: "/dealers/map/" } },
        { index: "04", role: "TOGETHER", title: "Pick up or take delivery", text: "Collect at the showroom or arrange delivery through that dealer.", link: { label: "Pickup & delivery options", href: "/guides/pickup-and-delivery-options/" } }
      ];
}

export function HomeProcess({ role, locale = "en-CA", id }: { role: AudienceRole; locale?: SiteLocale; id: string }) {
  const french = locale === "fr-CA";
  const steps = stepsFor(role, locale);
  const homeowner = role === "homeowner";

  useEffect(() => {
    const panel = document.getElementById(id);
    const grid = document.querySelector(".audience-path-grid");
    if (!panel || !(grid instanceof HTMLElement)) return;
    const header = document.querySelector("header, .site-header");
    const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
    const panelBox = panel.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();
    const vh = window.innerHeight;
    if (panelBox.top < vh) return;
    const maxScroll = gridBox.top - headerH - 8;
    const need = panelBox.top - (vh - 160);
    const delta = Math.max(0, Math.min(need, maxScroll));
    if (delta > 0) window.scrollBy({ top: delta, behavior: "smooth" });
  }, [id, role]);

  return (
    <Card className="audience-process" id={id}>
      <div className="audience-process-head">
        <h2>{french ? "Comment commander" : "How Ordering Works"}</h2>
        <Button asChild variant="link">
          <Link href={localeHref("/account/orders/", locale)} prefetch={false}>
            {french ? "Suivre une commande" : "Track an order"}
          </Link>
        </Button>
      </div>
      <ol className="audience-process-grid is-4">
        {steps.map((step) => (
          <li className="audience-process-step" key={step.index + step.title}>
            <span className="audience-process-index">{step.index}</span>
            <div>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
              {step.link ? (
                <Button asChild variant="link">
                  <Link href={step.link.href} prefetch={false}>
                    {step.link.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {homeowner ? (
        <p className="audience-process-note">
          {french
            ? "Vous commandez chez VanStro; l’exécution reste locale. Tout service offert séparément par un détaillant est convenu directement avec ce détaillant."
            : "You order from VanStro; fulfillment stays local. Any services offered separately by a dealer are agreed directly with that dealer."}
        </p>
      ) : null}
    </Card>
  );
}
