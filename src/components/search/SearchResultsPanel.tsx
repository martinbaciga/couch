"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronIcon } from "@/components/ui/icons";
import { focusRing } from "@/components/ui/styles";
import { tryTitles } from "@/config/try-titles";
import type { SearchResult } from "@/lib/search/query";
import { titleUrl } from "@/lib/search/query";
import { TitleRow } from "./TitleRow";

export type PanelMode = "hint" | "recent" | "results" | "empty" | "loading";

type SearchResultsPanelProps = {
  mode: PanelMode;
  query: string;
  rows: SearchResult[];
  listId: string;
  labelId: string;
  optionId: (index: number) => string;
  activeIndex: number;
  seeAllHref?: string;
  showEnter?: boolean;
  onHover: (index: number) => void;
  onSelect: (row: SearchResult) => void;
  onClose: () => void;
};

/**
 * Recently viewed, matches, the see-all row, or the no-results line.
 * It does not fetch or move the highlight.
 */
export function SearchResultsPanel({
  mode,
  query,
  rows,
  listId,
  labelId,
  optionId,
  activeIndex,
  seeAllHref,
  showEnter = false,
  onHover,
  onSelect,
  onClose,
}: SearchResultsPanelProps) {
  const t = useTranslations();

  if (mode === "hint") {
    return (
      <div id={listId} className="flex flex-col gap-3 px-4 pt-1 pb-5">
        <p className="text-body text-text-muted">{t("search.hint")}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-body text-primary-800">{t("search.try")}</span>
          {tryTitles.map((title) => (
            <Link
              key={`${title.kind}-${title.id}`}
              href={titleUrl(title.kind, title.id)}
              onClick={onClose}
              className={`inline-flex min-h-8 items-center rounded-panel border border-border-subtle px-3 py-1.5 text-body font-medium text-primary-800 hover:bg-primary-200 ${focusRing}`}
            >
              {title.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <p id={listId} className="px-4 py-4 text-body text-text-default">
        {t("search.noMatches", { query })}
      </p>
    );
  }

  if (mode === "loading") return null;

  const heading = mode === "recent" ? t("search.recent") : t("search.films");
  const seeAllIndex = rows.length;

  return (
    <div id={listId}>
      <p
        id={labelId}
        className="kicker px-4 pt-1 pb-1.5 text-small text-primary-700"
      >
        {heading}
      </p>
      <div role="listbox" aria-labelledby={labelId}>
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {rows.map((row, index) => (
            <TitleRow
              key={`${row.kind}-${row.id}`}
              density="compact"
              href={titleUrl(row.kind, row.id)}
              title={row.title}
              year={row.year}
              kind={row.kind}
              posterPath={row.posterPath}
              query={mode === "results" ? query : ""}
              active={activeIndex === index}
              optionId={optionId(index)}
              enterHint={showEnter && activeIndex === index}
              onHover={() => onHover(index)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
        {mode === "results" && seeAllHref ? (
          <Link
            href={seeAllHref}
            id={optionId(seeAllIndex)}
            role="option"
            aria-selected={activeIndex === seeAllIndex}
            tabIndex={-1}
            onClick={onClose}
            onMouseMove={() => onHover(seeAllIndex)}
            onMouseDown={(event) => event.preventDefault()}
            className={`flex items-center gap-2 border-t border-border-subtle px-4 py-3.5 text-ui font-medium text-text-default ${activeIndex === seeAllIndex ? "bg-primary-200" : ""} ${focusRing}`}
          >
            <span className="min-w-0 flex-1">
              {t("search.seeAll", { query })}
            </span>
            <ChevronIcon className="size-4 shrink-0 -rotate-90 rtl:rotate-90" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
