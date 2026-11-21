"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Disclosure } from "@/components/ui/Disclosure";
import { ImportIcon } from "@/components/ui/icons";
import { MenuButton, type MenuOption } from "@/components/ui/MenuButton";
import { MessageCard } from "@/components/ui/MessageCard";
import { OptionSheet, type SheetOption } from "@/components/ui/OptionSheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { Skeleton } from "@/components/ui/Skeleton";
import { logosFor, StatusText } from "@/components/search/TitleRow";
import { TitleRow } from "@/components/search/TitleRow";
import { createLimiter } from "@/lib/search/limit";
import { titleUrl } from "@/lib/search/query";
import { parseTitleLookup, type TitleLookup } from "@/lib/search/status-line";
import type { ServiceMark } from "@/lib/services/marks";
import {
  useSavedWatchlist,
  saveWatchlistSummary,
} from "@/lib/storage/use-watchlist";
import { useSettings } from "@/lib/storage/use-settings";
import type { Settings } from "@/lib/storage/settings";
import {
  CATEGORY_KEYS,
  type SavedWatchlist,
  type WatchlistMatch,
  type WatchlistSource,
} from "@/lib/storage/watchlist";
import { useSettingsHref } from "@/lib/use-settings-href";
import { WATCHLIST_IMPORT_PATH } from "@/lib/watchlist/paths";
import {
  PAGE_SIZE,
  categoryCounts,
  checkedStamp,
  classify,
  countsEqual,
  currentTime,
  defaultFilter,
  displayCounts,
  hasMore,
  isStale,
  oldestFetchedAt,
  sortFilms,
  visibleFilms,
  type Classified,
  type RowRead,
  type SortKey,
  type WatchlistFilter,
} from "@/lib/watchlist/results";

const limit = createLimiter(8);
const EMPTY_LOOKUPS: Record<string, TitleLookup | "miss"> = {};
let lookupsSnapshot: Record<string, TitleLookup | "miss"> = EMPTY_LOOKUPS;
const lookupListeners = new Set<() => void>();
const lookupsInFlight = new Set<string>();
const ALL_CHIP_ID = "watchlist-filter-all";
const SHOW_FIELD_ID = "watchlist-show";
const FILTER_SHEET_ID = "watchlist-filter-sheet";
const SORT_SHEET_ID = "watchlist-sort-sheet";

type Film = {
  entry: WatchlistSource;
  match: WatchlistMatch;
};

type RowModel = Film &
  Classified & {
    services: ServiceMark[];
  };

const NOTHING_SAVED: SavedWatchlist = {
  importedAt: "",
  entries: [],
  summary: {
    computedAt: null,
    counts: null,
    settingsAt: null,
    checkedAt: null,
  },
};

/** Results for a saved watchlist. No list yet still shows the empty results frame. */
export function WatchlistResults() {
  const saved = useSavedWatchlist();
  const settings = useSettings();
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  if (!mounted) return <WatchlistSkeleton />;
  return <WatchlistView saved={saved ?? NOTHING_SAVED} settings={settings} />;
}

function WatchlistView({
  saved,
  settings,
}: {
  saved: SavedWatchlist;
  settings: Settings | null;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const settingsHref = useSettingsHref();
  const availability = {
    country: settings?.country ?? null,
    serviceIds: settings?.serviceIds ?? [],
  };
  const matches = useMemo(
    () =>
      saved.entries.flatMap((item) =>
        item.match ? [{ entry: item.entry, match: item.match }] : [],
      ),
    [saved],
  );
  const unmatched = saved.entries.flatMap((item) =>
    item.match ? [] : [item.entry],
  );
  const { lookups, settled, complete } = useAvailability(matches);
  const rows = matches.map((film) => {
    const lookup = lookups[filmKey(film.match)];
    const classified = classify(lookup, availability);
    return {
      ...film,
      ...classified,
      services: lookup && lookup !== "miss" ? lookup.services : [],
      title: film.match.title,
      year: film.match.year,
      added: film.entry.date,
    };
  });
  const counts = displayCounts(rows.map((row) => row.filter));
  const stored = categoryCounts(rows.map((row) => row.category));
  const [filter, setFilter] = useState<WatchlistFilter | null>(null);
  const [sort, setSort] = useState<SortKey>("added");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = filter ?? defaultFilter(availability);
  const matching = rows.filter(
    (row) => selected === "all" || row.filter === selected,
  );
  const ordered = sortFilms(matching, sort);
  const visible = visibleFilms(ordered, shown);
  const now = currentTime();
  const stamp = checkedStamp(saved.summary.computedAt, saved.importedAt);
  const stale = isStale(stamp, now);
  const refreshing = stale && !complete && matches.length > 0;
  const hasList = saved.importedAt !== "";
  const needsSetup =
    !availability.country || availability.serviceIds.length === 0;
  const counted = CATEGORY_KEYS.reduce((sum, key) => sum + stored[key], 0);
  const fetchedAt = oldestFetchedAt(
    matches.map((film) => {
      const lookup = lookups[filmKey(film.match)];
      return lookup && lookup !== "miss" ? lookup.availability.fetchedAt : null;
    }),
  );
  const settingsAt = settings?.updatedAt ?? null;

  useEffect(() => {
    if (!saved.importedAt || !complete || counted !== matches.length) return;
    const now = currentTime();
    const previous = saved.summary.computedAt;
    const nextChecked =
      previous && !isStale(previous, now)
        ? previous
        : new Date(now).toISOString();
    if (
      countsEqual(saved.summary.counts, stored) &&
      previous === nextChecked &&
      saved.summary.settingsAt === settingsAt &&
      saved.summary.checkedAt === fetchedAt
    ) {
      return;
    }
    saveWatchlistSummary(stored, nextChecked, {
      settingsAt,
      checkedAt: fetchedAt,
    });
  }, [complete, counted, fetchedAt, matches.length, saved, settingsAt, stored]);

  const imported = saved.importedAt
    ? format.dateTime(new Date(saved.importedAt), {
        day: "numeric",
        month: "short",
      })
    : "";
  const filterOptions = filterChoices(counts, t, format);
  const sortOptions = sortChoices(t);

  function chooseFilter(id: string) {
    if (!isFilter(id) || id === selected) {
      setFilterOpen(false);
      return;
    }
    setFilter(id);
    setShown(PAGE_SIZE);
    setFilterOpen(false);
  }

  function chooseSort(id: string) {
    if (!isSort(id)) return;
    if (id !== sort) {
      setSort(id);
      setShown(PAGE_SIZE);
    }
    setSortOpen(false);
    setMenuOpen(false);
  }

  function showAll() {
    if (selected !== "all") setShown(PAGE_SIZE);
    setFilter("all");
    requestAnimationFrame(() => {
      const chip = document.getElementById(ALL_CHIP_ID);
      if (chip instanceof HTMLElement && chip.offsetParent !== null) {
        chip.focus();
        return;
      }
      document.getElementById(SHOW_FIELD_ID)?.focus();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-results flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-title font-bold md:text-heading">
              {t("watchlist.title")}
            </h1>
            <div className="text-body text-text-muted">
              <p>
                {saved.importedAt
                  ? t("watchlist.subtitle", {
                      count: matches.length,
                      date: imported,
                    })
                  : t("watchlist.subtitleNone", { count: matches.length })}
              </p>
              {refreshing && stamp ? (
                <p>
                  {t("watchlist.stale", {
                    when: format.relativeTime(new Date(stamp), now),
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            variant="secondary"
            size="small"
            href={WATCHLIST_IMPORT_PATH}
            icon={<ImportIcon />}
            className="self-start"
          >
            {t("watchlist.reimport")}
          </Button>
        </div>
        {needsSetup ? (
          <Button
            variant="link"
            href={settingsHref}
            className="-my-3 self-start"
          >
            {t("watchlist.setupPrompt")}
          </Button>
        ) : null}
      </header>

      {refreshing ? (
        <ProgressBar
          label={t("watchlist.refreshing")}
          valueText={t("watchlist.refreshCount", {
            done: settled,
            total: matches.length,
          })}
          value={settled}
          max={matches.length}
        />
      ) : null}

      {hasList ? (
        <>
          <div className="flex items-stretch gap-2 md:hidden">
            <SelectField
              id={SHOW_FIELD_ID}
              value={t("watchlist.showValue", {
                filter: filterLabel(selected, t),
                count: format.number(counts[selected]),
              })}
              expanded={filterOpen}
              controls={FILTER_SHEET_ID}
              onClick={() => setFilterOpen(true)}
              className="min-w-0 flex-1"
            />
            <SelectField
              text="body"
              value={sortLabel(sort, t)}
              expanded={sortOpen}
              controls={SORT_SHEET_ID}
              onClick={() => setSortOpen(true)}
              className="shrink-0"
            />
          </div>

          <div
            role="group"
            aria-label={t("watchlist.showBody")}
            className="hidden flex-wrap gap-2 md:flex"
          >
            {filterOptions.map((option) => (
              <Chip
                key={option.id}
                id={option.id === "all" ? ALL_CHIP_ID : undefined}
                pressed={option.id === selected}
                count={option.hint}
                onPressedChange={() => chooseFilter(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </div>

          <div className="hidden justify-end md:flex">
            <MenuButton
              label={t("watchlist.sortLabel", { option: sortLabel(sort, t) })}
              options={sortOptions}
              selected={sort}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onSelect={chooseSort}
            />
          </div>

          {complete && ordered.length === 0 ? (
            <EmptyFilter filter={selected} onShowAll={showAll} />
          ) : (
            <FilmList
              rows={visible}
              pending={!complete && visible.length === 0}
            />
          )}

          {hasMore(ordered.length, shown) ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                className="w-full md:w-auto"
                onClick={() => setShown((count) => count + PAGE_SIZE)}
              >
                {t("watchlist.showMore")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {unmatched.length > 0 ? (
        <Disclosure
          variant="card"
          label={t("watchlist.unmatched", { count: unmatched.length })}
        >
          <p className="text-text-muted">{t("watchlist.unmatchedBody")}</p>
          <ul className="flex list-none flex-col gap-1 p-0">
            {unmatched.map((item) => (
              <li key={`${item.name}-${item.year ?? ""}-${item.uri}`}>
                {item.year === null
                  ? item.name
                  : t("watchlist.unmatchedYear", {
                      name: item.name,
                      year: format.number(item.year, { useGrouping: false }),
                    })}
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      <OptionSheet
        id={FILTER_SHEET_ID}
        open={filterOpen}
        title={t("watchlist.show")}
        description={t("watchlist.showBody")}
        options={filterOptions}
        selected={selected}
        onSelect={chooseFilter}
        onClose={() => setFilterOpen(false)}
        closeLabel={t("watchlist.close")}
      />
      <OptionSheet
        id={SORT_SHEET_ID}
        open={sortOpen}
        title={t("watchlist.sortBy")}
        description={t("watchlist.sortBody")}
        options={sortOptions}
        selected={sort}
        onSelect={chooseSort}
        onClose={() => setSortOpen(false)}
        closeLabel={t("watchlist.close")}
      />
    </div>
  );
}

function FilmList({ rows, pending }: { rows: RowModel[]; pending: boolean }) {
  const t = useTranslations();
  if (pending) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          {t("states.loading.eyebrow")}
        </p>
        <ul className="flex list-none flex-col gap-3 p-0">
          {["a", "b", "c"].map((key) => (
            <li
              key={key}
              className="flex items-center gap-4 rounded-control border border-border-subtle bg-surface-card px-4 py-3"
            >
              <Skeleton className="aspect-poster w-12 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-24" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {rows.map((row, index) => (
        <li key={`${filmKey(row.match)}-${index}`}>
          <FilmRow row={row} />
        </li>
      ))}
    </ul>
  );
}

function FilmRow({ row }: { row: RowModel }) {
  const t = useTranslations();
  const format = useFormatter();
  const status = statusNode(row.read, row.services, t, format);
  const logos = logosForRead(row.read, row.services);

  return (
    <TitleRow
      density="card"
      href={titleUrl(row.match.kind, row.match.tmdbId, row.match.title)}
      title={row.match.title}
      year={row.match.year}
      kind={row.match.kind}
      posterPath={row.match.posterPath}
      status={status}
      logos={logos}
    />
  );
}

function statusNode(
  read: RowRead,
  services: ServiceMark[],
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
) {
  if (read.kind === "loading") {
    return <StatusText phase="loading" line={null} services={[]} />;
  }
  if (read.kind === "blank") return null;
  if (read.kind === "available") {
    return (
      <span className="text-body font-medium text-text-default">
        {t("watchlist.availableIn", { count: read.count })}
      </span>
    );
  }
  if (read.kind === "free") {
    const names = namesFor(read.serviceIds, services);
    if (names.length === 0) return null;
    return (
      <span className="text-body font-medium text-text-default">
        {t("watchlist.freeOn", {
          service: format.list(names, { type: "conjunction" }),
        })}
      </span>
    );
  }
  return (
    <>
      <StatusText phase="ready" line={read.line} services={services} />
      {read.line.kind === "no-data" ? (
        <span className="text-caption text-text-muted">
          {t("watchlist.noDataNote")}
        </span>
      ) : null}
    </>
  );
}

function logosForRead(read: RowRead, services: ServiceMark[]): ServiceMark[] {
  if (read.kind === "free") return marksFor(read.serviceIds, services);
  if (read.kind === "known") return logosFor(read.line, services);
  return [];
}

function namesFor(ids: number[], services: ServiceMark[]): string[] {
  return ids.flatMap((id) => {
    const name = services.find((service) => service.id === id)?.name;
    return name ? [name] : [];
  });
}

function marksFor(ids: number[], services: ServiceMark[]): ServiceMark[] {
  return ids.flatMap((id) => {
    const mark = services.find((service) => service.id === id);
    return mark ? [mark] : [];
  });
}

function EmptyFilter({
  filter,
  onShowAll,
}: {
  filter: WatchlistFilter;
  onShowAll: () => void;
}) {
  const t = useTranslations();
  const copy = emptyCopy(filter, t);
  return (
    <MessageCard
      width="fill"
      eyebrow={t("watchlist.empty.eyebrow")}
      title={copy.title}
      body={copy.body}
      action={
        <Button variant="secondary" size="small" onClick={onShowAll}>
          {t("watchlist.showAll")}
        </Button>
      }
    />
  );
}

function WatchlistSkeleton() {
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

function subscribeLookups(listener: () => void) {
  lookupListeners.add(listener);
  return () => {
    lookupListeners.delete(listener);
  };
}

function getLookups() {
  return lookupsSnapshot;
}

function getServerLookups() {
  return EMPTY_LOOKUPS;
}

function rememberLookup(id: string, value: TitleLookup | "miss") {
  lookupsSnapshot = { ...lookupsSnapshot, [id]: value };
  for (const listener of lookupListeners) listener();
}

function useAvailability(films: Film[]) {
  const lookups = useSyncExternalStore(
    subscribeLookups,
    getLookups,
    getServerLookups,
  );
  const ids = films.map((film) => filmKey(film.match));
  const settled = ids.filter((id) => lookups[id] !== undefined).length;

  useEffect(() => {
    const known = getLookups();
    const wanted = films.map((film) => filmKey(film.match));
    const missing = [
      ...new Set(
        wanted.filter(
          (id) => known[id] === undefined && !lookupsInFlight.has(id),
        ),
      ),
    ];
    if (missing.length === 0) return;
    let cancelled = false;
    const controllers: AbortController[] = [];

    for (const id of missing) {
      const film = films.find((item) => filmKey(item.match) === id);
      if (!film) continue;
      lookupsInFlight.add(id);
      const controller = new AbortController();
      controllers.push(controller);
      void limit(async () => {
        const response = await fetch(
          `/api/title/${film.match.kind}/${film.match.tmdbId}`,
          { signal: controller.signal },
        );
        if (!response.ok) return null;
        return parseTitleLookup(await response.json());
      }, controller.signal)
        .then((result) => {
          lookupsInFlight.delete(id);
          if (cancelled) return;
          rememberLookup(id, result ?? "miss");
        })
        .catch(() => {
          lookupsInFlight.delete(id);
          if (cancelled || controller.signal.aborted) return;
          rememberLookup(id, "miss");
        });
    }

    return () => {
      cancelled = true;
      for (const id of missing) lookupsInFlight.delete(id);
      for (const controller of controllers) controller.abort();
    };
  }, [films]);

  return { lookups, settled, complete: settled === ids.length };
}

function filmKey(match: WatchlistMatch): string {
  return `${match.kind}:${match.tmdbId}`;
}

function subscribeNothing() {
  return () => undefined;
}

function filterChoices(
  counts: Record<WatchlistFilter, number>,
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): SheetOption[] {
  const order: WatchlistFilter[] = [
    "all",
    "on-my-services-here",
    "free-or-ads-here",
    "other-services-here",
    "rent-or-buy-here-only",
    "other-countries-only",
    "no-data",
  ];
  return order.map((id) => ({
    id,
    label: filterLabel(id, t),
    hint: format.number(counts[id]),
  }));
}

function sortChoices(t: ReturnType<typeof useTranslations>): MenuOption[] {
  return [
    {
      id: "added",
      label: t("watchlist.sort.added"),
      hint: t("watchlist.sort.addedHint"),
    },
    {
      id: "title",
      label: t("watchlist.sort.title"),
      hint: t("watchlist.sort.titleHint"),
    },
    {
      id: "year",
      label: t("watchlist.sort.year"),
      hint: t("watchlist.sort.yearHint"),
    },
  ];
}

function filterLabel(
  filter: WatchlistFilter,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (filter) {
    case "all":
      return t("watchlist.filters.all");
    case "on-my-services-here":
      return t("watchlist.filters.onYourServices");
    case "free-or-ads-here":
      return t("watchlist.filters.freeOrAds");
    case "other-services-here":
      return t("watchlist.filters.otherServices");
    case "rent-or-buy-here-only":
      return t("watchlist.filters.rentOrBuy");
    case "other-countries-only":
      return t("watchlist.filters.otherCountries");
    case "no-data":
      return t("watchlist.filters.noData");
  }
}

function sortLabel(
  sort: SortKey,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (sort) {
    case "added":
      return t("watchlist.sort.added");
    case "title":
      return t("watchlist.sort.title");
    case "year":
      return t("watchlist.sort.year");
  }
}

function emptyCopy(
  filter: WatchlistFilter,
  t: ReturnType<typeof useTranslations>,
): { title: string; body: string } {
  switch (filter) {
    case "all":
      return {
        title: t("watchlist.empty.all.title"),
        body: t("watchlist.empty.all.body"),
      };
    case "on-my-services-here":
      return {
        title: t("watchlist.empty.onYourServices.title"),
        body: t("watchlist.empty.onYourServices.body"),
      };
    case "free-or-ads-here":
      return {
        title: t("watchlist.empty.freeOrAds.title"),
        body: t("watchlist.empty.freeOrAds.body"),
      };
    case "other-services-here":
      return {
        title: t("watchlist.empty.otherServices.title"),
        body: t("watchlist.empty.otherServices.body"),
      };
    case "rent-or-buy-here-only":
      return {
        title: t("watchlist.empty.rentOrBuy.title"),
        body: t("watchlist.empty.rentOrBuy.body"),
      };
    case "other-countries-only":
      return {
        title: t("watchlist.empty.otherCountries.title"),
        body: t("watchlist.empty.otherCountries.body"),
      };
    case "no-data":
      return {
        title: t("watchlist.empty.noData.title"),
        body: t("watchlist.empty.noData.body"),
      };
  }
}

function isFilter(value: string): value is WatchlistFilter {
  return (
    value === "all" ||
    value === "on-my-services-here" ||
    value === "free-or-ads-here" ||
    value === "other-services-here" ||
    value === "rent-or-buy-here-only" ||
    value === "other-countries-only" ||
    value === "no-data"
  );
}

function isSort(value: string): value is SortKey {
  return value === "added" || value === "title" || value === "year";
}
