"use client";

import { useTranslations } from "next-intl";
import { focusRing, motionColor } from "./styles";
import { ImdbIcon, LetterboxdIcon, YouTubeIcon } from "./icons";
import type { TitleLinkService } from "@/lib/title-details";

const icons = {
  letterboxd: LetterboxdIcon,
  imdb: ImdbIcon,
  trailer: YouTubeIcon,
} as const;

/**
 * Outbound title link. Same soft pill as a country chip, with a 16px mark.
 * The accessible name says the title and that the link opens a new tab.
 */
export function LinkChip({
  service,
  href,
  title,
}: {
  service: TitleLinkService;
  href: string;
  title: string;
}) {
  const t = useTranslations();
  const label = {
    letterboxd: t("title.links.letterboxd"),
    imdb: t("title.links.imdb"),
    trailer: t("title.links.trailer"),
  }[service];
  const Icon = icons[service];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("title.links.open", { title, service: label })}
      className={`inline-flex h-8 items-center gap-1.5 rounded-panel bg-primary-100 py-1.5 ps-2.5 pe-3 text-small whitespace-nowrap text-primary-800 hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`}
    >
      <span className="size-4 shrink-0">
        <Icon />
      </span>
      {label}
    </a>
  );
}
