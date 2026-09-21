import Link from "next/link";
import { ArrowUpRight, Boxes, ClipboardList, LayoutDashboard, PenTool, CircleHelp } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  buttonVariants
} from "@/components/ui";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";
import "./dealer-access.css";

type AccessCard = {
  key: "studio" | "crm" | "erp" | "orders";
  index: string;
  title: string;
  description: string;
  capabilities: string[];
  action: string;
  href: string;
  ariaLabel: string;
  icon: typeof PenTool;
  newWindow: boolean;
};

type DealerAccessCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  workspace: string;
  available: string;
  cardsLabel: string;
  supportLabel: string;
  supportDescription: string;
  supportAction: string;
  cards: AccessCard[];
};

const EN_CARDS: AccessCard[] = [
  {
    key: "studio",
    index: "01 / PLAN",
    title: "Design Studio",
    description: "Plan and review cabinet layouts in the design workspace.",
    capabilities: ["Cabinet layouts", "Room planning", "Design review"],
    action: "Open Design Studio",
    href: "https://tools.vanstro.ca/",
    ariaLabel: "Open Design Studio in a new window",
    newWindow: true,
    icon: PenTool
  },
  {
    key: "crm",
    index: "02 / MANAGE",
    title: "CRM Dealer Portal",
    description: "Manage customers, quotes, invoices and payments.",
    capabilities: ["Customers & contacts", "Quotes & invoices", "Payments"],
    action: "Open CRM Portal",
    href: "https://crm.vanstro.ca/dealer/",
    ariaLabel: "Open CRM Dealer Portal in a new window",
    newWindow: true,
    icon: LayoutDashboard
  },
  {
    key: "erp",
    index: "03 / OPERATE",
    title: "ERP",
    description: "Coordinate product, inventory and fulfillment operations.",
    capabilities: ["Products & inventory", "Orders & fulfillment", "Operational records"],
    action: "Open ERP",
    href: "https://erp.vanstro.ca/",
    ariaLabel: "Open ERP in a new window",
    newWindow: true,
    icon: Boxes
  },
  {
    key: "orders",
    index: "04 / ORDER",
    title: "Order System",
    description: "Place orders and review your order history.",
    capabilities: ["Place orders", "Order history", "Account details"],
    action: "Open Order System",
    href: "/account/login",
    ariaLabel: "Open Order System",
    icon: ClipboardList,
    newWindow: false
  }
];

const FR_CARDS: AccessCard[] = [
  {
    ...EN_CARDS[0],
    title: "Studio de conception",
    description: "Planifiez et révisez les plans d’armoires dans l’espace de conception.",
    capabilities: ["Plans d’armoires", "Planification de pièces", "Révision de conception"],
    action: "Ouvrir le Studio",
    ariaLabel: "Ouvrir le Studio de conception dans une nouvelle fenêtre"
  },
  {
    ...EN_CARDS[1],
    title: "Portail détaillant CRM",
    description: "Gérez les clients, les devis, les factures et les paiements.",
    capabilities: ["Clients et contacts", "Devis et factures", "Paiements"],
    action: "Ouvrir le portail CRM",
    ariaLabel: "Ouvrir le portail détaillant CRM dans une nouvelle fenêtre"
  },
  {
    ...EN_CARDS[2],
    title: "ERP",
    description: "Coordonnez les produits, les stocks et les opérations d’exécution.",
    capabilities: ["Produits et stocks", "Commandes et exécution", "Dossiers opérationnels"],
    action: "Ouvrir l’ERP",
    ariaLabel: "Ouvrir l’ERP dans une nouvelle fenêtre"
  },
  {
    ...EN_CARDS[3],
    title: "Système de commandes",
    description: "Passez vos commandes et consultez l’historique de vos commandes.",
    capabilities: ["Passer des commandes", "Historique des commandes", "Détails du compte"],
    action: "Ouvrir le système de commandes",
    ariaLabel: "Ouvrir le système de commandes"
  }
];

const COPY: Record<SiteLocale, DealerAccessCopy> = {
  "en-CA": {
    eyebrow: "VanStro partner access",
    title: "Dealer Portal",
    lede: "Select a system to continue.",
    workspace: "Select a workspace",
    available: "04 available",
    cardsLabel: "Dealer business systems",
    supportLabel: "Need a hand?",
    supportDescription: "Contact your VanStro partner support team.",
    supportAction: "Ask your VanStro contact",
    cards: EN_CARDS
  },
  "fr-CA": {
    eyebrow: "Accès partenaire VanStro",
    title: "Portail détaillant",
    lede: "Sélectionnez un système pour continuer.",
    workspace: "Sélectionnez un espace de travail",
    available: "04 disponibles",
    cardsLabel: "Systèmes d’affaires pour détaillants",
    supportLabel: "Besoin d’aide?",
    supportDescription: "Communiquez avec l’équipe de soutien aux partenaires VanStro.",
    supportAction: "Joindre votre contact VanStro",
    cards: FR_CARDS
  }
};

export function DealerAccessPage({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const copy = COPY[locale];
  const contactHref = localeHref("/contact", locale);

  return (
    <section className="dealer-access-main" aria-labelledby="dealer-access-title">
      <div className="dealer-access-container">
        <header className="dealer-access-hero">
          <p className="dealer-access-eyebrow">{copy.eyebrow}</p>
          <h1 className="dealer-access-title" id="dealer-access-title">{copy.title}</h1>
          <p className="dealer-access-lede">{copy.lede}</p>
        </header>
        <div className="dealer-access-meta" aria-label={`${copy.workspace}, ${copy.available}`}>
          <Separator className="dealer-access-rule" />
          <span className="dealer-access-meta-label">{copy.workspace}</span>
          <span aria-hidden="true">/</span>
          <span className="dealer-access-meta-label">{copy.available}</span>
        </div>
        <div className="dealer-access-grid" aria-label={copy.cardsLabel}>
          {copy.cards.map((card) => {
            const Icon = card.icon;
            const cardInner = (
              <>
                <CardHeader className="dealer-access-card-top">
                  <span className="dealer-access-index">{card.index}</span>
                  <span className="dealer-access-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.45} /></span>
                </CardHeader>
                <CardContent className="dealer-access-card-content">
                  <CardTitle className="dealer-access-card-title">{card.title}</CardTitle>
                  <p className="dealer-access-card-desc">{card.description}</p>
                  <ul className="dealer-access-capabilities" aria-label={`${card.title} capabilities`}>
                    {card.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
                  </ul>
                </CardContent>
                <CardFooter className="dealer-access-card-footer">
                  <span className={buttonVariants({ variant: "primary", size: "sm" })}>{card.action}</span>
                  <ArrowUpRight className="dealer-access-arrow" size={18} aria-hidden="true" />
                </CardFooter>
              </>
            );
            return (
              <Card className="dealer-access-card access-card" data-system={card.key} key={card.key}>
                {card.newWindow ? (
                  <a href={card.href} target="_blank" rel="noopener noreferrer" aria-label={card.ariaLabel}>
                    {cardInner}
                  </a>
                ) : (
                  <Link href={localeHref(card.href, locale)} aria-label={card.ariaLabel}>
                    {cardInner}
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
        <aside className="dealer-access-support" aria-label={copy.supportLabel}>
          <div className="dealer-access-support-copy">
            <span className="dealer-access-support-mark" aria-hidden="true"><CircleHelp size={16} /></span>
            <div><strong>{copy.supportLabel}</strong><span>{copy.supportDescription}</span></div>
          </div>
          <Link className={`${buttonVariants({ variant: "link", size: "sm" })} dealer-access-support-link`} href={contactHref}>{copy.supportAction}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </aside>
      </div>
    </section>
  );
}

export { COPY as dealerAccessCopy };
