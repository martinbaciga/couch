"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { containsFolded } from "@/lib/text";
import { CloseIcon } from "./icons";
import { ServiceOption } from "./ServiceOption";
import { focusRing } from "./styles";

export type SearchableService = {
  id: number;
  name: string;
  src: string | null;
};

type ServiceSearchProps = {
  services: readonly SearchableService[];
  selectedIds: readonly number[];
  onToggle: (id: number) => void;
};

/** Filters the catalogue as you type and lists matches as service options. */
export function ServiceSearch({
  services,
  selectedIds,
  onToggle,
}: ServiceSearchProps) {
  const t = useTranslations();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const needle = query.trim();
  const matches = needle
    ? services.filter((service) => containsFolded(service.name, needle))
    : [];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-body font-medium">
        {t("settings.find")}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={query}
          placeholder={t("settings.findPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
          className={`h-12 w-full rounded-control border border-border-strong bg-surface-field px-4 text-search text-text-default placeholder:text-text-muted ${focusRing} ${
            query ? "pe-12" : ""
          }`}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("settings.clearSearch")}
            className={`absolute end-1 top-1 inline-flex size-11 cursor-pointer items-center justify-center ${focusRing}`}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
      {needle && matches.length === 0 ? (
        <p className="text-body text-text-muted">
          {t("settings.noService", { query: needle })}
        </p>
      ) : null}
      {matches.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {matches.map((service) => (
            <li key={service.id}>
              <ServiceOption
                name={service.name}
                src={service.src}
                selected={selectedIds.includes(service.id)}
                onToggle={() => onToggle(service.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-body text-text-muted">{t("settings.planNote")}</p>
    </div>
  );
}
