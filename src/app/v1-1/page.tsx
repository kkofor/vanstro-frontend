import type { Metadata } from "next";
import { HomePageV11 } from "@/components/home/HomePageV11";
import { getHomePageData } from "@/lib/api/server";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "VanStro Homepage 1.1",
  "A version 1.1 storefront concept for VanStro with commerce navigation, stock lookup and product merchandising.",
  "/v1-1"
);

export default async function V11Page() {
  const data = await getHomePageData();

  return <HomePageV11 {...data} />;
}
