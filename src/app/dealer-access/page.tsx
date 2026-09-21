import type { Metadata } from "next";
import { DealerAccessPage } from "@/components/dealer-access/DealerAccessPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Partner access",
  description: "Access VanStro dealer and partner business systems.",
  path: "/dealer-access",
  noIndex: true
});

export default function DealerAccessRoute() {
  return <DealerAccessPage />;
}
