import type { Metadata } from "next";
import { HomePageV11 } from "@/components/home/HomePageV11";
import { getHomePageData } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "VanStro Homepage 1.1",
  description:
    "A version 1.1 storefront concept for VanStro with commerce navigation, stock lookup and product merchandising."
};

export default async function V11Page() {
  const data = await getHomePageData();

  return <HomePageV11 {...data} />;
}
