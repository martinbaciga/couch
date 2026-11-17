"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  CountrySelect,
  type CountryOption,
} from "@/components/ui/CountrySelect";
import { countryServicesView } from "./country-services";

type CountryServicesProps = {
  options: readonly CountryOption[];
  country: string | null;
  onCountry: (code: string) => void;
  selectedCount: number;
  children?: ReactNode;
};

/**
 * Country field and service list shared by Settings and the first-run dialog.
 * Nothing here is written until the parent handles a choice.
 */
export function CountryServices({
  options,
  country,
  onCountry,
  selectedCount,
  children,
}: CountryServicesProps) {
  const t = useTranslations();
  const view = countryServicesView(country, selectedCount);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <CountrySelect
          label={t("settings.country")}
          options={options}
          value={country}
          onChange={onCountry}
        />
        {view.helper ? (
          <p className="text-body text-text-muted">
            {t("settings.countryHint")}
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-body font-medium">{t("settings.services")}</p>
          {view.services === "shown" ? (
            <p
              aria-live="polite"
              className={
                view.showSelectedCount ? "text-body text-text-muted" : "sr-only"
              }
            >
              {t("settings.selected", { count: selectedCount })}
            </p>
          ) : null}
        </div>
        {view.services === "hidden" ? (
          <p className="text-body text-text-muted">
            {t("settings.servicesEmpty")}
          </p>
        ) : (
          <>
            <p className="text-body text-text-muted">
              {t("settings.servicesPrompt")}
            </p>
            {children}
          </>
        )}
      </section>
    </div>
  );
}
