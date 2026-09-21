import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Page not found",
  description: "The requested page could not be found. Return home or browse VanStro products.",
  path: "/404",
  noIndex: true,
  languages: {
    "en-CA": "/404",
    "fr-CA": "/fr/404",
    "x-default": "/404"
  }
});

export default function EnglishNotFoundPage() {
  return <NotFoundPage />;
}
