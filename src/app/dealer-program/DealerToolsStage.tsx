"use client";

import { useState } from "react";

type ToolKey = "design" | "erp" | "crm";

const EN = {
  tabs: [
    ["design", "3D design", "Product library plus AI render"],
    ["erp", "Dealer ERP", "Orders, inventory and sales"],
    ["crm", "Dealer CRM", "Accounts through after-sales"]
  ] as const,
  designTitle: "3D design with the VanStro product library",
  designText:
    "The workspace includes the VanStro product library (boxes, vanities, trim and hardware). The dealer builds a room, then the tool can produce a render the showroom team reviews with the customer.",
  designItems: [
    "The VanStro product library is available in the workspace.",
    "Place products in a room layout and adjust doors, finishes and hardware while the customer is present.",
    "The tool can generate a rendering of the current scene for review with the customer.",
    "A layout can be turned into a product list for a later VanStro order.",
    "The render and product list stay with the dealer. They do not change VanStro product pricing or dealer-service fees."
  ],
  erpTitle: "Dedicated ERP for orders, inventory and sales",
  erpText:
    "Participating dealers get a VanStro ERP console so the same team can follow a product order from draft through warehouse movement, sales posting and after-sales without leaving the dealer login.",
  erpItems: [
    "Track sales orders, purchase orders and draft quotes in one console.",
    "Watch existing inventory, warehouse applications and product or SKU movement.",
    "Read sales amount and order-count trends, plus order-status mix such as pending, outbound and installed.",
    "Keep commission, deposit, after-sales refund and tax records next to the order, not in a separate spreadsheet.",
    "Filter by date range and dealer or product view when the written approval opens those records."
  ],
  crmTitle: "CRM for the dealer's local book of business",
  crmText:
    "The CRM sits beside the ERP so the same dealer team can keep the customer conversation, the project calendar and the after-sales case in one place. VanStro supplies the system. The dealer owns the local records and the customer relationship.",
  crmItems: [
    "Accounts and contacts for showroom, contractor and repeat buyers.",
    "Leads and opportunities so a kitchen or millwork inquiry has a named owner and a next step.",
    "Sales and purchases tied back to VanStro product orders, without mixing dealer-service invoices into VanStro product pricing.",
    "Tasks, calendar, meetings, calls and email threads on the same account.",
    "Support cases and a knowledge base for delivery, return and product questions the dealer handles first."
  ]
};

const FR = {
  tabs: [
    ["design", "Conception 3D", "Bibliothèque de produits et rendu"],
    ["erp", "ERP pour les détaillants", "Commandes, stocks et ventes"],
    ["crm", "CRM pour les détaillants", "Comptes jusqu’au service après-vente"]
  ] as const,
  designTitle: "Conception 3D avec la bibliothèque de produits VanStro",
  designText:
    "L’espace de conception contient déjà les caissons, meubles-lavabos, moulures et quincaillerie VanStro. Le détaillant compose une pièce, puis un rendu permet à l’équipe de le passer en revue avec le client.",
  designItems: [
    "La bibliothèque de produits VanStro est chargée dans l’espace de conception.",
    "Placez les produits dans un plan de pièce et ajustez portes, finis et quincaillerie en présence du client.",
    "Un rendu de la scène courante sert à la consultation.",
    "Le plan devient une liste de produits pour une commande VanStro ultérieure.",
    "Le rendu et la liste restent chez le détaillant. Ils ne changent ni le prix des produits VanStro ni les frais de service du détaillant."
  ],
  erpTitle: "ERP dédié aux commandes, aux stocks et aux ventes",
  erpText:
    "Les détaillants participants reçoivent une console ERP VanStro pour suivre une commande de produit, du brouillon jusqu’à l’entrepôt, la vente et le service après-vente.",
  erpItems: [
    "Suivez les commandes de vente, les achats et les devis dans une même console.",
    "Consultez les stocks, les mouvements d’entrepôt et les UGS.",
    "Lisez les tendances de ventes et le mix des statuts de commande.",
    "Tenez les dossiers de commission, de dépôt, de remboursement et de taxes à côté de la commande.",
    "Filtrez par période et par vue lorsque l’approbation écrite ouvre ces dossiers."
  ],
  crmTitle: "CRM pour le portefeuille local du détaillant",
  crmText:
    "Le CRM est à côté de l’ERP pour que la même équipe tienne la conversation client, le calendrier et le dossier après-vente au même endroit. VanStro fournit le système. Le détaillant possède les dossiers locaux et la relation client.",
  crmItems: [
    "Comptes et contacts pour la salle d’exposition, les entrepreneurs et les acheteurs réguliers.",
    "Pistes et occasions avec un responsable nommé et une prochaine étape.",
    "Ventes et achats liés aux commandes de produits VanStro, sans mélanger les factures de service du détaillant au prix des produits.",
    "Tâches, calendrier, réunions, appels et courriels sur le même compte.",
    "Dossiers de soutien et base de connaissances pour la livraison, les retours et les questions sur les produits."
  ]
};

export function DealerToolsStage({ french }: { french: boolean }) {
  const copy = french ? FR : EN;
  const [tool, setTool] = useState<ToolKey>("design");

  return (
    <>
      <div className="tool-switch" role="tablist" aria-label={french ? "Outils d’exploitation" : "Dealer operating tools"}>
        {copy.tabs.map(([key, title, blurb]) => (
          <button
            className="tool-tab"
            type="button"
            role="tab"
            key={key}
            id={`tab-${key}`}
            aria-selected={tool === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTool(key)}
          >
            <h3>{title}</h3>
            <p>{blurb}</p>
          </button>
        ))}
      </div>
      <div className="tool-stage">
        <div className="wrap">
          <div className={`tool-panel${tool === "design" ? " is-on" : ""}`} id="panel-design" role="tabpanel" hidden={tool !== "design"}>
            <div className="tool-copy">
              <h3>{copy.designTitle}</h3>
              <p>{copy.designText}</p>
              <ul>
                {copy.designItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className={`tool-panel${tool === "erp" ? " is-on" : ""}`} id="panel-erp" role="tabpanel" hidden={tool !== "erp"}>
            <div className="tool-copy">
              <h3>{copy.erpTitle}</h3>
              <p>{copy.erpText}</p>
              <ul>
                {copy.erpItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className={`tool-panel${tool === "crm" ? " is-on" : ""}`} id="panel-crm" role="tabpanel" hidden={tool !== "crm"}>
            <div className="tool-copy">
              <h3>{copy.crmTitle}</h3>
              <p>{copy.crmText}</p>
              <ul>
                {copy.crmItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const CHEV = (
  <span className="chev" aria-hidden="true">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  </span>
);
