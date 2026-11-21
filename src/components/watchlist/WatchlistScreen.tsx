"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSavedWatchlist } from "@/lib/storage/use-watchlist";
import { WatchlistImport } from "./WatchlistImport";
import { WatchlistResults } from "./WatchlistResults";

/**
 * `/watchlist` with nothing saved is the import screen.
 * `?import=1` opens it again when a list is already saved.
 * The query is request data, so the page wraps this in Suspense.
 */
export function WatchlistScreen() {
  const importing = useSearchParams().get("import") === "1";
  const saved = useSavedWatchlist();
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  if (importing) return <WatchlistImport />;
  if (!mounted) return <WatchlistSkeleton />;
  if (!saved?.importedAt) return <WatchlistImport />;
  return <WatchlistResults />;
}

export function WatchlistSkeleton() {
  const t = useTranslations();
  return (
    <div
      className="mx-auto flex w-full max-w-results flex-col gap-6"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        {t("states.loading.eyebrow")}
      </p>
      <Skeleton className="h-8 w-64 max-w-full md:h-10" />
      <Skeleton className="h-5 w-full max-w-md" />
    </div>
  );
}

function subscribeNothing() {
  return () => undefined;
}
