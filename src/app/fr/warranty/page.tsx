import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Politique de garantie limitée de 12 mois",
  description:
    "Durée de couverture, exclusions, délai de notification et processus de réclamation pour la garantie limitée de 12 mois de VanStro sur les armoires de cuisine et les meubles-lavabos.",
  path: "/fr/warranty",
  locale: "fr_CA",
  noIndex: true
});

const WARRANTY_PDF_HREF = "/resources/vanstro-cabinet-vanity-warranty-2026-en-fr.pdf";

export default function FrenchWarrantyPage() {
  return (
    <>
      <section className="page-hero unified-content-hero">
        <div className="container unified-content-hero-grid">
          <PageBreadcrumb
            className="unified-content-hero-breadcrumb"
            items={[{ label: "Accueil", href: "/fr" }, { label: "Garantie" }]}
          />
          <div className="unified-content-hero-copy">
            <h1>Politique de garantie limitée de 12 mois</h1>
            <p>Produits d&rsquo;armoires de cuisine et de meubles-lavabos</p>
            <p>VanStro ne garantit que les produits d&rsquo;armoires qu&rsquo;elle fournit.</p>
          </div>
        </div>
      </section>

      <section className="page-panel">
        <div className="container legal-page">
          <div className="legal-content">
            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Couverture</h2>
                <p>
                  VanStro garantit à l&rsquo;acheteur client final d&rsquo;origine que les
                  armoires de cuisine, les meubles-lavabos, les charnières et les glissières de
                  tiroir seront exempts de défauts de matériaux et de fabrication dans des
                  conditions d&rsquo;utilisation résidentielle normale pendant une période de
                  douze (12) mois à compter de la date d&rsquo;achat par le client final
                  d&rsquo;origine. Dans la mesure maximale permise par la loi applicable, la
                  présente garantie est non transférable. Une preuve d&rsquo;achat est requise.
                </p>
                <small>Source : Couverture, page 1.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Exclusions</h2>
                <p>La présente garantie ne couvre pas :</p>
                <ul className="legal-bullet-list">
                  <li>L&rsquo;usure normale</li>
                  <li>Les dommages causés par une mauvaise utilisation, un abus ou une installation incorrecte</li>
                  <li>
                    Les conditions environnementales, y compris, sans s&rsquo;y limiter,
                    l&rsquo;humidité, la température et l&rsquo;exposition à la lumière
                  </li>
                  <li>Une manutention ou un entreposage inappropriés</li>
                  <li>Les événements de force majeure</li>
                  <li>Aucun coût de main-d&rsquo;œuvre, y compris les coûts de démontage et de réinstallation</li>
                </ul>
                <small>Source : Exclusions, page 3.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Délai de notification</h2>
                <p>
                  Le client doit fournir un avis écrit de tout défaut allégué à VanStro ou au
                  revendeur dans les trente (30) jours suivant la découverte d&rsquo;un tel
                  défaut, et en tout état de cause avant l&rsquo;expiration de la période de
                  garantie. Lorsque la loi applicable prévoit une période raisonnable plus
                  longue ou ne permet pas l&rsquo;établissement d&rsquo;un délai fixe de
                  notification, la loi applicable prévaut.
                </p>
                <small>Source : Délai de notification, page 3.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Recours en garantie</h2>
                <p>
                  VanStro se réserve le droit, à sa seule et entière discrétion, de réparer ou de
                  remplacer les produits défectueux par des produits fonctionnellement
                  équivalents de qualité égale ou supérieure. Les pièces de remplacement peuvent
                  différer des pièces d&rsquo;origine. VanStro ne prend en charge que le coût des
                  pièces de remplacement; tous les autres coûts, y compris, sans s&rsquo;y
                  limiter, les coûts d&rsquo;installation, de démontage et de transport,
                  relèvent de la responsabilité du revendeur ou du client, tels qu&rsquo;ils sont
                  répartis séparément entre VanStro et le revendeur dans le cadre d&rsquo;un
                  accord écrit distinct. Lorsque la loi applicable en matière de protection du
                  consommateur détermine que la répartition des coûts ci-dessus est abusive ou
                  inexécutoire, VanStro et le revendeur négocieront un arrangement raisonnable de
                  partage des coûts, ou une telle répartition sera effectuée conformément à la
                  loi applicable. Une réparation ou un remplacement effectué dans le cadre de la
                  présente garantie n&rsquo;étend, ne renouvelle ni ne crée une nouvelle période
                  de garantie. VanStro se réserve le droit d&rsquo;exiger l&rsquo;inspection, le
                  retour ou la vérification de tout produit défectueux allégué avant
                  d&rsquo;approuver le remplacement ou la réparation.
                </p>
                <small>Source : Recours en garantie, pages 3–4.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Exigence du numéro de série</h2>
                <p>
                  Toutes les réclamations en garantie doivent inclure un numéro de série de
                  produit valide. Les réclamations sans identification valide du numéro de série
                  de produit seront rejetées.
                </p>
                <small>Source : Exigence du numéro de série, page 4.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Droits légaux</h2>
                <p>
                  Aucune disposition de la présente garantie n&rsquo;affecte ni ne limite les
                  droits légaux du client en vertu des lois provinciales canadiennes applicables
                  en matière de protection du consommateur, y compris, sans s&rsquo;y limiter,
                  les lois provinciales sur la protection du consommateur, les lois sur la vente
                  de biens et autres lois impératives de protection du consommateur. En
                  particulier, pour les clients résidant au Québec, cela comprend (le cas
                  échéant) la Loi sur la protection du consommateur du Québec et les dispositions
                  du Code civil du Québec relatives aux vices cachés. Lorsque la loi applicable
                  prévoit des périodes de garantie plus longues ou des droits non susceptibles
                  d&rsquo;exclusion, ces droits prévalent.
                </p>
                <small>Source : Droits légaux, page 5.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Portée</h2>
                <p>La présente garantie n&rsquo;est valable qu&rsquo;au Canada.</p>
                <small>Source : Portée, page 5.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Loi applicable</h2>
                <p>
                  La présente garantie est régie et interprétée conformément aux lois de la
                  province du Manitoba, Canada, sauf lorsque la province de résidence du client
                  exige l&rsquo;application de ses propres lois impératives de protection du
                  consommateur qui ne peuvent être exclues par convention.
                </p>
                <small>Source : Loi applicable, pages 5–6.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Réclamation de garantie</h2>
                <p>
                  Pour présenter une réclamation en garantie, veuillez d&rsquo;abord contacter
                  votre revendeur VanStro autorisé, en fournissant un avis écrit, le numéro de
                  série du produit et une preuve d&rsquo;achat. Si le revendeur n&rsquo;est pas
                  joignable, contactez VanStro directement. Si le revendeur fournit sa propre
                  garantie étendue, les modalités écrites du revendeur prévalent dans le cadre
                  d&rsquo;une telle extension.
                </p>
                <small>Source : Réclamation de garantie, page 6.</small>
              </div>
            </section>
          </div>

          <aside className="summary-panel legal-summary">
            <div className="legal-summary-copy">
              <span className="legal-summary-kicker">Service à la clientèle</span>
              <h2>Document de garantie complet</h2>
              <p>
                Cette page présente les principaux termes de la politique de garantie en
                vigueur. Date d&rsquo;entrée en vigueur : 2026-05-02.
              </p>
            </div>
            <div className="legal-summary-actions">
              <a
                className="button button-primary"
                href={assetPath(WARRANTY_PDF_HREF)}
                target="_blank"
                rel="noreferrer"
              >
                Document de garantie complet (PDF)
              </a>
              <a className="button button-secondary" href="mailto:warranty@vanstro.ca">
                warranty@vanstro.ca
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
