"use client";

import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronIcon } from "@/components/ui/icons";
import { Poster } from "@/components/ui/Poster";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { focusRing, motionColor } from "@/components/ui/styles";
import { titleMatch } from "@/lib/search/query";
import type { StatusLine } from "@/lib/search/status-line";
import type { ServiceMark } from "@/lib/services/marks";
import { posterUrl } from "@/lib/tmdb/poster";
import type { RowPhase } from "./useRowStatus";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

type TitleRowProps = {
  density: "compact" | "card";
  href: string;
  title: string;
  year: number | null;
  kind: "movie" | "tv";
  posterPath: string | null;
  query?: string;
  active?: boolean;
  optionId?: string;
  enterHint?: boolean;
  status?: ReactNode;
  logos?: ServiceMark[];
  onSelect?: () => void;
  onHover?: () => void;
  rowRef?: RefObject<HTMLAnchorElement | null>;
};

/**
 * One title. Compact sits in the search panel. Card is a results-page row:
 * poster, title, year, kind, status and a link to the title.
 */
export function TitleRow({
  density,
  href,
  title,
  year,
  kind,
  posterPath,
  query = "",
  active = false,
  optionId,
  enterHint = false,
  status,
  logos = [],
  onSelect,
  onHover,
  rowRef,
}: TitleRowProps) {
  const t = useTranslations();
  const format = useFormatter();
  const kindLabel = kind === "movie" ? t("title.film") : t("title.series");
  const meta =
    year === null
      ? kindLabel
      : t("title.yearKind", {
          year: format.number(year, { useGrouping: false }),
          kind: kindLabel,
        });
  const compact = density === "compact";
  const className = compact
    ? `flex items-center gap-3.5 rounded-md border bg-primary-200 p-2 ${active ? "stroke-selected" : "border-border-subtle"} ${motionColor} ${focusRing}`
    : `flex items-center gap-4 rounded-control border border-border-subtle bg-surface-card px-4 py-3 hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`;

  return (
    <Link
      ref={rowRef}
      href={href}
      id={optionId}
      role={compact ? "option" : undefined}
      aria-selected={compact ? active : undefined}
      tabIndex={compact ? -1 : undefined}
      onClick={onSelect}
      onMouseMove={onHover}
      onMouseDown={compact ? (event) => event.preventDefault() : undefined}
      className={className}
    >
      <Poster
        framed
        src={posterUrl(posterPath, "w185")}
        alt={title}
        className={compact ? "w-10" : "w-12"}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {compact ? (
          <>
            <span className="truncate text-search text-text-default">
              <Highlighted title={title} query={query} />
            </span>
            <span className="text-caption text-text-muted">{meta}</span>
          </>
        ) : (
          <>
            <span className="flex flex-wrap items-end gap-x-2">
              <span className="font-display text-section font-bold text-text-default">
                {title}
              </span>
              <span className="text-body text-text-muted">{meta}</span>
            </span>
            {status}
          </>
        )}
      </span>
      {logos.length > 0 ? (
        <span className="flex shrink-0">
          {logos.map((logo) => (
            <ServiceLogo
              key={logo.id}
              name={logo.name}
              src={posterUrl(logo.logoPath, "w92")}
              size="small"
              decorative
            />
          ))}
        </span>
      ) : null}
      {enterHint ? (
        <span
          aria-hidden="true"
          className="hidden shrink-0 rounded-md border border-border-subtle px-2 py-0.5 text-small font-medium text-primary-800 md:inline"
        >
          {t("search.enter")}
        </span>
      ) : null}
      {compact ? null : (
        <ChevronIcon className="size-4.5 shrink-0 -rotate-90 text-text-default rtl:rotate-90" />
      )}
    </Link>
  );
}

export function StatusText({
  phase,
  line,
  services,
}: {
  phase: RowPhase;
  line: StatusLine | null;
  services: ServiceMark[];
}) {
  const t = useTranslations();
  const format = useFormatter();
  if (phase === "hidden") return null;
  if (phase !== "ready" || !line) {
    return <Skeleton className="h-3.5 w-44" />;
  }
  return (
    <span className="text-body font-medium text-text-default">
      {lineText(line, services, t, format)}
    </span>
  );
}

export function logosFor(
  line: StatusLine | null,
  services: ServiceMark[],
): ServiceMark[] {
  if (!line || (line.kind !== "on-service" && line.kind !== "plan-only")) {
    return [];
  }
  return line.serviceIds.flatMap((id) => {
    const mark = services.find((service) => service.id === id);
    return mark ? [mark] : [];
  });
}

function Highlighted({ title, query }: { title: string; query: string }) {
  const parts = titleMatch(title, query);
  if (!parts) return title;
  return (
    <>
      {parts.before}
      <span className="font-bold">{parts.match}</span>
      {parts.after}
    </>
  );
}

function lineText(
  line: StatusLine,
  services: ServiceMark[],
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): string {
  if (line.kind === "on-service") {
    return t("search.onService", {
      service: listed(namesFor(line.serviceIds, services), format),
      country: countryName(line.country),
    });
  }
  if (line.kind === "plan-only") {
    return t("homeCard.planOnly", {
      service: listed(namesFor(line.serviceIds, services), format),
    });
  }
  if (line.kind === "not-on-yours") {
    return t("search.notOnYours", { country: countryName(line.country) });
  }
  if (line.kind === "rent-or-buy") {
    return t("search.rentOrBuy", { country: countryName(line.country) });
  }
  if (line.kind === "other-countries") {
    return t("search.otherCountries", { count: line.count });
  }
  if (line.kind === "services-here") {
    return t("homeCard.streamingCount", {
      count: line.count,
      country: countryName(line.country),
    });
  }
  if (line.kind === "streaming-countries") {
    return t("otherCountries.streamingIn", { count: line.count });
  }
  return t("search.noData");
}

function namesFor(ids: number[], services: ServiceMark[]): string[] {
  return ids.flatMap((id) => {
    const name = services.find((service) => service.id === id)?.name;
    return name ? [name] : [];
  });
}

function listed(
  names: string[],
  format: ReturnType<typeof useFormatter>,
): string {
  return format.list(names, { type: "conjunction" });
}

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
