"use client";

import Link from "next/link";
import { ChevronRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

const EN = [
  {
    q: "Do I order on this site or at a dealer?",
    a: "You can shop and check stock here. Fulfillment runs through a participating dealer — showroom, warehouse, pickup or delivery — not a container at the curb."
  },
  {
    q: "Is the price the same at every dealer?",
    a: "Yes. The price on the product page is the national price. No regional markup and no haggling for the same SKU."
  },
  {
    q: "Is inventory already in Canada?",
    a: "Stock sits in Canadian warehouses and on dealer floors. Availability still depends on your postal code and the dealer serving that area."
  },
  {
    q: "Can I see the finish before I buy?",
    a: "Yes. Every approved dealer keeps a working display floor. Finishes read differently in person — go look, then order at the same price you see here."
  },
  {
    q: "Pickup or delivery?",
    a: "Both, through participating locations. Coverage and lead times vary by postal code. Review pickup and delivery options in the resource centre before you plan a job site."
  },
  {
    q: "How do I measure for cabinets?",
    a: "Confirm wall space, plumbing, door swings and filler widths before you order. Use the measuring guide in the Resource Centre, or contact us for a free drawing. The 3D design tool is for dealers."
  }
];

const FR = [
  {
    q: "Est-ce que je commande ici ou chez un détaillant ?",
    a: "Vous pouvez magasiner et vérifier le stock ici. L’exécution passe par un détaillant participant — salle d’exposition, entrepôt, ramassage ou livraison."
  },
  {
    q: "Le prix est-il le même chez tous les détaillants ?",
    a: "Oui. Le prix de la fiche produit est le prix national. Pas de majoration régionale ni de marchandage sur le même SKU."
  },
  {
    q: "Le stock est-il déjà au Canada ?",
    a: "Oui. Les stocks sont dans des entrepôts canadiens et chez les détaillants. La disponibilité dépend tout de même de votre code postal et du détaillant de la zone."
  },
  {
    q: "Puis-je voir le fini avant d’acheter ?",
    a: "Oui. Chaque détaillant approuvé tient un plancher d’exposition. Les finis se lisent autrement sur place — allez voir, puis commandez au même prix qu’ici."
  },
  {
    q: "Ramassage ou livraison ?",
    a: "Les deux, via les emplacements participants. La couverture et les délais varient selon le code postal. Consultez les options de ramassage et de livraison avant de planifier le chantier."
  },
  {
    q: "Comment mesurer pour des armoires ?",
    a: "Confirmez l’espace mural, la plomberie, le battement des portes et les largeurs de remplissage avant de commander. Utilisez le guide de mesure du centre de ressources, ou communiquez avec nous pour un dessin gratuit. L’outil 3D est réservé aux détaillants."
  }
];

export function HomeFaq({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const items = french ? FR : EN;

  return (
    <section className="section home-faq" aria-labelledby="home-faq-title">
      <div className="container">
        <p className="home-faq-eyebrow">FAQ</p>
        <div className="home-faq-grid">
        <div className="home-faq-intro">
          <h2 id="home-faq-title">{french ? "Questions fréquentes" : "Frequently Asked Questions"}</h2>
          <p>
            {french
              ? "Réponses courtes aux questions les plus fréquentes des propriétaires, entrepreneurs et détaillants partenaires."
              : "Short answers to what homeowners, contractors and dealer partners ask most."}
          </p>
          <Card className="home-faq-help">
            <p className="home-faq-help-kicker">{french ? "Besoin d’une personne ?" : "Still need a person?"}</p>
            <Button asChild variant="ghost" className="home-faq-help-row">
              <a href="tel:+12042212288">
                <span className="home-faq-help-icon">
                  <Phone size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="home-faq-help-copy">
                  <strong>204 221 2288</strong>
                  <small>{french ? "Lun–Ven, 9 h–17 h" : "Mon to Fri, 9 a.m.–5 p.m."}</small>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="ghost" className="home-faq-help-row">
              <Link href={localeHref("/contact/", locale)} prefetch={false}>
                <span className="home-faq-help-icon">
                  <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="home-faq-help-copy">
                  <strong>{french ? "Nous joindre" : "Contact support"}</strong>
                  <small>{french ? "Réponse en un jour ouvrable" : "Reply within one business day"}</small>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="home-faq-help-row">
              <Link href={localeHref("/dealers/map/", locale)} prefetch={false}>
                <span className="home-faq-help-icon">
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="home-faq-help-copy">
                  <strong>{french ? "Trouver un détaillant" : "Find a dealer"}</strong>
                  <small>{french ? "Parlez à quelqu’un sur place" : "Talk to someone local"}</small>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Button>
          </Card>
        </div>
        <Accordion type="single" collapsible className="home-faq-list">
          {items.map((item) => (
            <AccordionItem value={item.q} key={item.q}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        </div>
      </div>
    </section>
  );
}
