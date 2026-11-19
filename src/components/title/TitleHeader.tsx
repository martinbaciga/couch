"use client";

import { useFormatter, useTranslations } from "next-intl";
import { FilmIcon } from "@/components/ui/icons";
import { Poster } from "@/components/ui/Poster";
import type { TitleDetails } from "@/lib/tmdb/types";
import { posterUrl } from "@/lib/tmdb/poster";
import { CopyLink } from "./CopyLink";

/**
 * Poster, title and year. MAR-49 fills the synopsis and links.
 * Copy link sits with the title on mobile and last in the column on desktop
 * (`md:order-2`), so a later details block can use `md:order-1`.
 */
export function TitleHeader({ details }: { details: TitleDetails }) {
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
          <CopyLink className="self-start md:order-2" />
        </div>
      </div>
    </div>
  );
}
