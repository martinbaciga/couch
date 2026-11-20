"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImportIcon, SearchIcon, SettingsIcon } from "@/components/ui/icons";
import { NavItem } from "@/components/ui/NavItem";
import { focusRing } from "@/components/ui/styles";
import { useSettings } from "@/lib/storage/use-settings";
import { useSearch } from "./search-context";

/** English names from the regions list, keyed by ISO code. */
export type RegionNames = Readonly<Record<string, string>>;

function countryName(regions: RegionNames, code: string): string {
  const key = code.toUpperCase();
  return regions[key] ?? key;
}

/** Charcoal lockup. Settings shows the saved country and services on every page. */
export function Header({ regions }: { regions: RegionNames }) {
  const t = useTranslations();
  const pathname = usePathname();
  const settings = useSettings();
  const { openSearch } = useSearch();
  const landing = pathname === "/";
  const country = settings?.country ?? null;
  const count = settings?.serviceIds.length ?? 0;
  const name = country ? countryName(regions, country) : null;

  const setupLabel = name
    ? t("header.setupSummary", { country: name, count })
    : t("header.setup");
  const setupShort = country
    ? t("header.setupCompact", {
        code: country.toUpperCase(),
        count,
      })
    : t("header.setupShort");
  const setupAccessible = name
    ? t("header.setupAccessible", { country: name, count })
    : t("header.setupAccessibleEmpty");

  return (
    <header className="relative z-20">
      <div className="mx-auto flex min-h-nav w-full min-w-0 max-w-page flex-wrap items-center justify-between gap-1 px-gutter">
        <Link
          href="/"
          aria-label={t("header.home")}
          className={`shrink-0 rounded-button ${focusRing}`}
        >
          {/* Supplied brand SVG. Height is the header lockup size; the file's paths are unchanged. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-charcoal.svg"
            alt=""
            width={86}
            height={24}
            className="h-6 w-auto"
          />
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1">
          {landing ? (
            <NavItem
              href="/watchlist"
              icon={<ImportIcon />}
              label={t("header.importWatchlist")}
            />
          ) : (
            <>
              <NavItem
                iconOnly
                icon={<SearchIcon />}
                label={t("header.search")}
                tooltipAlign="end"
                onClick={openSearch}
              />
              <NavItem
                iconOnly
                href="/watchlist"
                icon={<ImportIcon />}
                label={t("header.importWatchlist")}
                tooltipAlign="end"
              />
            </>
          )}
          <NavItem
            href="/settings"
            icon={<SettingsIcon />}
            label={setupLabel}
            shortLabel={setupShort}
            accessibleName={setupAccessible}
          />
        </nav>
      </div>
    </header>
  );
}
