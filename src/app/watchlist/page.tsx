import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WatchlistResults } from "@/components/watchlist/WatchlistResults";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("watchlist.title") };
}

export default function WatchlistPage() {
  return <WatchlistResults />;
}
