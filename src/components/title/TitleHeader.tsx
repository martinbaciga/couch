"use client";

import { useFormatter, useTranslations } from "next-intl";
import { FilmIcon } from "@/components/ui/icons";
import { LinkChip } from "@/components/ui/LinkChip";
import { Poster } from "@/components/ui/Poster";
import {
  homeCertification,
  titleLinks,
  titleMetaParts,
} from "@/lib/title-details";
import type { TitleDetails } from "@/lib/tmdb/types";
import { posterUrl } from "@/lib/tmdb/poster";
import { CopyLink } from "./CopyLink";

/**
 * Poster, title, meta line, synopsis and outbound links.
 * Copy link stays with the title on mobile and last in the column on desktop
 * (`md:order-2`). Synopsis and links use `md:order-1`, so they sit under the
 * meta line there and under the poster row on mobile.
 */
export function TitleHeader({
  details,
  country,
}: {
  details: TitleDetails;
  country: string | null;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const kind = details.kind === "movie" ? t("title.film") : t("title.series");
  const yearLine =
    details.year === null
      ? kind
      : t("title.yearKind", {
          year: format.number(details.year, { useGrouping: false }),
          kind,
        });
  const meta = metaLine(
    titleMetaParts(
      {
        kind: details.kind,
        runtimeMinutes: details.runtimeMinutes,
        numberOfSeasons: details.numberOfSeasons,
        genres: details.genres.map((genre) => genre.name),
        certification: homeCertification(details.ageRatings, country),
      },
      {
        hours: (value) =>
          format.number(value, {
            style: "unit",
            unit: "hour",
            unitDisplay: "narrow",
          }),
        minutes: (value) =>
          format.number(value, {
            style: "unit",
            unit: "minute",
            unitDisplay: "narrow",
          }),
        units: (parts) => format.list(parts, { type: "unit", style: "narrow" }),
        genres: (names) =>
          format.list(names, { type: "conjunction", style: "narrow" }),
        seasons: (count) => t("title.seasons", { count }),
      },
    ),
    (first, second) => t("title.metaPair", { first, second }),
  );
  const synopsis = details.overview.trim();
  const links = titleLinks(details);

  return (
    <div className="flex w-full flex-col gap-6 md:w-poster-lg md:gap-4.5">
      <div className="flex items-start gap-4 md:contents">
        <Poster
          src={posterUrl(details.posterPath, "w500")}
          alt={details.title}
          className="w-poster shrink-0 shadow-poster md:w-full"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:contents">
          <h1 className="title-name">{details.title}</h1>
          <p className="flex items-center gap-1.5 text-search text-primary-700">
            <span className="size-4 shrink-0" aria-hidden="true">
              <FilmIcon />
            </span>
            {yearLine}
          </p>
          {meta ? <p className="text-small text-text-muted">{meta}</p> : null}
          <CopyLink className="self-start md:order-2" />
        </div>
      </div>
      {synopsis || links.length > 0 ? (
        <div className="flex flex-col gap-6 md:order-1 md:gap-4.5">
          {synopsis ? (
            <p className="line-clamp-4 text-small text-text-default">
              {synopsis}
            </p>
          ) : null}
          {links.length > 0 ? (
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {links.map((link) => (
                <li key={link.service}>
                  <LinkChip
                    service={link.service}
                    href={link.href}
                    title={details.title}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function metaLine(
  parts: readonly string[],
  pair: (first: string, second: string) => string,
): string | null {
  const [first, ...rest] = parts;
  if (!first) return null;
  return rest.reduce((line, part) => pair(line, part), first);
}
