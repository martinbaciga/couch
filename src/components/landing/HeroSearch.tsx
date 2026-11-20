"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SearchCombobox } from "@/components/search/SearchCombobox";
import { focusRing, motionColor } from "@/components/ui/styles";
import { tryTitles } from "@/config/try-titles";
import { settingsHref } from "@/lib/return-path";
import { titleUrl } from "@/lib/search/query";
import { useNeedsSetup } from "@/lib/storage/use-settings";
import { useSettingsHref } from "@/lib/use-settings-href";

const setupClass = `items-center py-3 text-body text-primary-900 underline underline-offset-2 ${focusRing}`;

/**
 * Landing search: the shared field, the Try pills, and the setup link.
 * On a small screen the pills sit above the field. On a large screen they
 * share a row with the setup link, under the field.
 */
export function HeroSearch() {
  const t = useTranslations();
  const showSetup = useNeedsSetup();

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 md:mx-auto md:max-w-search md:gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5 md:order-2 md:px-2.5 md:py-2.5">
        <span className="text-body text-primary-800">{t("search.try")}</span>
        {tryTitles.map((title) => (
          <Link
            key={`${title.kind}-${title.id}`}
            href={titleUrl(title.kind, title.id, title.label)}
            className={`inline-flex min-h-8 items-center rounded-panel bg-primary-100 px-3 py-1.5 text-body font-medium text-primary-800 hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`}
          >
            {title.label}
          </Link>
        ))}
        {showSetup ? (
          <SetupLink
            className={`${setupClass} -my-3 ms-auto hidden md:inline-flex`}
          />
        ) : null}
      </div>
      <div className="md:order-1">
        <SearchCombobox variant="hero" />
      </div>
      {showSetup ? (
        <div className="px-2.5 md:hidden">
          <SetupLink className={`inline-flex ${setupClass}`} />
        </div>
      ) : null}
    </div>
  );
}

function SetupLink({ className }: { className: string }) {
  return (
    <Suspense
      fallback={<SetupAnchor href={settingsHref("/")} className={className} />}
    >
      <CurrentSetupLink className={className} />
    </Suspense>
  );
}

function CurrentSetupLink({ className }: { className: string }) {
  return <SetupAnchor href={useSettingsHref()} className={className} />;
}

function SetupAnchor({ href, className }: { href: string; className: string }) {
  const t = useTranslations();
  return (
    <Link href={href} className={className}>
      {t("landing.setup")}
    </Link>
  );
}
