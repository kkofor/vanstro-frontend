import type { Metadata } from "next";
import { AccountFavoritesClient } from "@/components/account/AccountFavoritesClient";
import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account favorites",
  "Review favorite VanStro products saved to your account.",
  "/account/favorites"
);

export function AccountFavoritesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <AccountPageFrame
      locale={locale}
      title={french ? "Favoris" : "Favorites"}
      description={french ? "Retrouvez les produits enregistrés pour vos prochains projets." : "Return to products saved for upcoming projects."}
    >
      <AccountFavoritesClient locale={locale} />
    </AccountPageFrame>
  );
}

export default function AccountFavoritesPage() {
  return <AccountFavoritesPageContent />;
}
