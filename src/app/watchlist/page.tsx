import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  WatchlistScreen,
  WatchlistSkeleton,
} from "@/components/watchlist/WatchlistScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("watchlist.title") };
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistScreen />
    </Suspense>
  );
}
