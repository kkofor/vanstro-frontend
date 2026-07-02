import { HomePage } from "@/components/home/HomePage";
import { getHomePageData } from "@/lib/api/server";

export default async function Page() {
  const data = await getHomePageData();

  return <HomePage {...data} />;
}
