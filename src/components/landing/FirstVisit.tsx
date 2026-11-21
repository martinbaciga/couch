"use client";

import { useTranslations } from "next-intl";
import { useRecentlyViewed } from "@/lib/storage/use-recent";
import { useSavedWatchlist } from "@/lib/storage/use-watchlist";
import { HeroImage } from "./HeroImage";
import { HeroSearch } from "./HeroSearch";
import { ImportCard } from "./ImportCard";
import { RecentlyViewed } from "./RecentlyViewed";
import { WatchlistSummary } from "./WatchlistSummary";

/**
 * Home page. With nothing saved, this is the first visit. A saved watchlist
 * replaces the import card, and any titles opened on this device are listed
 * under it.
 */
export function FirstVisit() {
  const t = useTranslations();
  const watchlist = useSavedWatchlist();
  const recent = useRecentlyViewed();
  const returning = watchlist !== null;

  return (
    <div className="w-full min-w-0 -my-6">
      <section
        className={`landing-top w-full min-w-0 md:gap-10 ${returning ? "landing-return gap-6" : ""}`}
      >
        <div
          className={`flex w-full min-w-0 flex-col items-center gap-3 text-center md:gap-field md:pt-10 ${returning ? "pt-4" : "pt-24"}`}
        >
          <HeroImage />
          <h1 className="landing-title w-full max-w-landing text-text-default">
            {t("landing.title")}
          </h1>
          <p className="w-full max-w-landing text-search text-text-muted md:text-section">
            {t("landing.subtitle")}
          </p>
        </div>
        {returning ? null : <div className="min-h-0 flex-1 md:hidden" />}
        <HeroSearch />
      </section>
      <div className="mx-auto flex w-full max-w-search flex-col gap-8 pt-3 pb-10 md:pt-10 md:pb-20">
        {returning && watchlist ? (
          <WatchlistSummary saved={watchlist} />
        ) : (
          <ImportCard />
        )}
        {returning || recent.length > 0 ? (
          <RecentlyViewed titles={recent} />
        ) : null}
      </div>
    </div>
  );
}
