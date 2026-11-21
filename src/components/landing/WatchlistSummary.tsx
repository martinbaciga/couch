"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/lib/storage/use-settings";
import type { SavedWatchlist } from "@/lib/storage/watchlist";
import { WATCHLIST_IMPORT_PATH, WATCHLIST_PATH } from "@/lib/watchlist/paths";
import {
  SUMMARY_ROWS,
  countsAreStale,
  filmCount,
  freshness,
} from "@/lib/watchlist/landing";

/** Re-reads the clock once a minute so "3 days ago" can move on. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Saved-watchlist card. Counts come from the stored summary. When settings
 * have changed since that summary, the numbers stay up and are marked stale
 * until the results page writes a new one.
 */
export function WatchlistSummary({ saved }: { saved: SavedWatchlist }) {
  const t = useTranslations();
  const format = useFormatter();
  const settings = useSettings();
  const now = useNow();
  const counts = saved.summary.counts;
  const stale = countsAreStale(saved.summary, settings?.updatedAt ?? null);
  const films = filmCount(saved.entries);
  const imported = format.dateTime(new Date(saved.importedAt), {
    day: "numeric",
    month: "short",
  });
  const checkedIso = saved.summary.checkedAt ?? saved.summary.computedAt;
  const checked = checkedText(checkedIso, now, t, format);

  return (
    <section className="flex flex-col gap-5 rounded-panel border border-border-default bg-surface-card p-6">
      <div className="flex flex-col gap-3">
        <p className="landing-eyebrow">
          {t("landing.watchlistLabel", { count: films })}
        </p>
        {counts ? (
          <h2 className="text-message font-bold text-text-default">
            {t("landing.streaming", {
              count: counts["on-my-services-here"],
            })}
          </h2>
        ) : (
          <h2
            className="text-message font-bold text-text-default"
            role="status"
          >
            {t("landing.recalculating")}
          </h2>
        )}
        {counts && stale ? (
          <p className="text-caption text-text-muted" role="status">
            {t("landing.recalculating")}
          </p>
        ) : null}
      </div>
      {counts ? (
        <ul className="flex list-none flex-col p-0">
          {SUMMARY_ROWS.map((key) => (
            <li
              key={key}
              className="flex min-h-11 items-center justify-between gap-4 border-t border-border-subtle py-3"
            >
              <span className="text-search text-text-default">
                {rowLabel(key, t)}
              </span>
              <span className="text-ui font-medium text-text-default">
                {format.number(counts[key])}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button href={WATCHLIST_PATH}>{t("landing.explore")}</Button>
        <Button variant="secondary" href={WATCHLIST_IMPORT_PATH}>
          {t("landing.reimport")}
        </Button>
      </div>
      <p className="text-caption text-text-muted">
        {checked
          ? t("landing.importedChecked", { date: imported, when: checked })
          : t("landing.imported", { date: imported })}
      </p>
    </section>
  );
}

function rowLabel(
  key: (typeof SUMMARY_ROWS)[number],
  t: ReturnType<typeof useTranslations>,
): string {
  switch (key) {
    case "on-my-services-here":
      return t("landing.rows.onYourServices");
    case "free-or-ads-here":
      return t("landing.rows.freeOrAds");
    case "other-services-here":
      return t("landing.rows.otherServices");
    case "rent-or-buy-here-only":
      return t("landing.rows.rentOrBuy");
    case "other-countries-only":
      return t("landing.rows.otherCountries");
    case "no-data":
      return t("landing.rows.noData");
  }
}

function checkedText(
  iso: string | null,
  now: number,
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): string | null {
  if (!iso) return null;
  const kind = freshness(iso, now);
  if (!kind) return null;
  if (kind === "just-now") return t("landing.justNow");
  const date = new Date(iso);
  if (kind === "date") {
    return format.dateTime(date, { day: "numeric", month: "short" });
  }
  return format.relativeTime(date, now);
}
