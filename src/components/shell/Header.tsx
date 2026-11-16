"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImportIcon, SearchIcon, SettingsIcon } from "@/components/ui/icons";
import { NavItem } from "@/components/ui/NavItem";
import { focusRing } from "@/components/ui/styles";
import { useSettings } from "@/lib/storage/use-settings";
import { SearchDialog } from "./SearchDialog";

function regionName(code: string): string {
  try {
    return (
      new Intl.DisplayNames("en", { type: "region" }).of(code.toUpperCase()) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

/** Charcoal lockup on every page. Landing uses text items; every other page uses icons. */
export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const settings = useSettings();
  const landing = pathname === "/";
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const setupLabel = settings?.country
    ? t("header.setupSummary", {
        country: regionName(settings.country),
        count: settings.serviceIds.length,
      })
    : t("header.setup");

  return (
    <header className="relative z-20">
      <div className="mx-auto flex min-h-nav w-full max-w-page flex-wrap items-center justify-between gap-1 px-gutter">
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
            <>
              <NavItem
                href="/watchlist"
                icon={<ImportIcon />}
                label={t("header.importWatchlist")}
              />
              <NavItem
                href="/settings"
                icon={<SettingsIcon />}
                label={setupLabel}
              />
            </>
          ) : (
            <>
              <NavItem
                iconOnly
                icon={<SearchIcon />}
                label={t("header.search")}
                tooltipAlign="end"
                onClick={() => setSearchOpen(true)}
              />
              <NavItem
                iconOnly
                href="/watchlist"
                icon={<ImportIcon />}
                label={t("header.importWatchlist")}
                tooltipAlign="end"
              />
              <NavItem
                iconOnly
                href="/settings"
                icon={<SettingsIcon />}
                label={t("header.settings")}
                tooltipAlign="end"
              />
            </>
          )}
        </nav>
      </div>
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
