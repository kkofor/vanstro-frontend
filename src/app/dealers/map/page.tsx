import type { Metadata } from "next";
import Link from "next/link";
import { DealerMapLocator } from "@/components/dealer/DealerMapLocator";
import { SecondaryPageHero } from "@/components/layout/SecondaryPageHero";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dealer map",
  description: "View VanStro dealer locations and local fulfillment coverage on the dealer map.",
  path: "/dealers/map",
  image: "/assets/generated/dealer-map-storefront-v1.webp"
});

export default function DealerMapPage() {
  return (
    <>
      <SecondaryPageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dealer program", href: "/dealer-program" },
          { label: "Dealer map" }
        ]}
        title="Dealer map"
        image={{
          src: "/assets/generated/dealer-map-storefront-v1.webp",
          alt: "Customer arriving at a participating independent VanStro dealer location"
        }}
        actions={
          <>
            <a className="button button-primary" href="#dealer-map">
              View map
            </a>
            <Link className="button button-secondary" href="/contact#dealer-contacts">
              Contact local support
            </Link>
          </>
        }
      >
        <p>
          Find a participating independent VanStro dealer for local product
          support, pickup and order fulfillment.
        </p>
      </SecondaryPageHero>

      <section className="page-panel dealer-map-panel" id="dealer-map">
        <div className="container">
          <DealerMapLocator />
        </div>
      </section>
    </>
  );
}
