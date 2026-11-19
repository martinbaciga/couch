"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Flag } from "@/components/ui/Flag";
import { ChevronIcon } from "@/components/ui/icons";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { focusRing, motionColor } from "@/components/ui/styles";
import {
  getOtherCountries,
  getSituation,
  otherCountriesHeadline,
  type CountryTier,
  type MyServiceCountries,
  type OtherCountriesHeadline,
  type Settings,
} from "@/lib/availability/status";
import type { TitleAvailability } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import { posterUrl } from "@/lib/tmdb/poster";
import { useSettings } from "@/lib/storage/use-settings";
import { CountryTable } from "./CountryTable";

const COUNTRY_PREVIEW = 6;
const SERVICE_PREVIEW = 3;
const countryChipClass =
  "inline-flex items-center gap-1.5 rounded-panel bg-primary-100 px-3 py-1.5 text-body font-medium text-primary-800";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

type View = "service" | "country";

type OtherCountriesProps = {
  availability: TitleAvailability;
  settings: Settings;
  services: ServiceMark[];
  view: View;
  onViewChange: (view: View) => void;
  /** Country rows with the toggle hidden. Used when no country or services are set. */
  presentation?: "services" | "countries";
};

/**
 * "In other countries", by service. The by-country list is MAR-45.
 * Counts and order come from `getOtherCountries`.
 */
export function OtherCountries({
  availability,
  settings,
  services,
  view,
  onViewChange,
  presentation = "services",
}: OtherCountriesProps) {
  const t = useTranslations();
  const other = getOtherCountries(availability, settings);
  if (presentation === "countries" && other.byCountry.length === 0) return null;
  const headline = otherCountriesHeadline(
    getSituation(availability, settings),
    other,
  );
  const marks = new Map(services.map((service) => [service.id, service]));
  const count =
    other.totalCountries > 0 ? other.totalCountries : other.byCountry.length;
  const text =
    presentation === "countries"
      ? t("otherCountries.streamingIn", { count })
      : headlineText(headline, marks, t);

  return (
    <section className="rounded-panel border border-primary-600 bg-surface-card">
      <div className="flex flex-col gap-2.5 p-5 md:p-6">
        <p className="kicker text-body text-primary-700">
          {t("otherCountries.label")}
        </p>
        <div className="flex flex-col gap-4 pt-2.5 md:flex-row md:items-center md:gap-6">
          <h2 className="message-title min-w-0 flex-1 text-primary-1000">
            {text}
          </h2>
          {presentation === "services" ? (
            <SegmentedToggle
              label={t("toggle.group")}
              value={view}
              onValueChange={onViewChange}
              serviceLabel={t("toggle.service")}
              countryLabel={t("toggle.country")}
            />
          ) : null}
        </div>
      </div>
      {presentation === "countries" ? (
        <CountryTable
          rows={other.byCountry}
          marks={marks}
          settings={settings}
        />
      ) : view === "service" ? (
        <ServiceView other={other} marks={marks} onViewChange={onViewChange} />
      ) : null}
    </section>
  );
}

/** Reads this device's settings and keeps the view in `?view=country`. */
export function OtherCountriesBlock({
  availability,
  services,
  view: initialView,
}: {
  availability: TitleAvailability;
  services: ServiceMark[];
  view: View;
}) {
  const saved = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState(initialView);
  const [trackedView, setTrackedView] = useState(initialView);
  if (initialView !== trackedView) {
    setTrackedView(initialView);
    setView(initialView);
  }
  const settings: Settings = {
    country: saved?.country ?? null,
    serviceIds: saved?.serviceIds ?? [],
  };

  function onViewChange(next: View) {
    setView(next);
    const params = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    );
    if (next === "country") params.set("view", "country");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <OtherCountries
      availability={availability}
      settings={settings}
      services={services}
      view={view}
      onViewChange={onViewChange}
    />
  );
}

function ServiceView({
  other,
  marks,
  onViewChange,
}: {
  other: ReturnType<typeof getOtherCountries>;
  marks: Map<number, ServiceMark>;
  onViewChange: (view: View) => void;
}) {
  const t = useTranslations();
  const [servicesOpen, setServicesOpen] = useState(false);
  const shown = servicesOpen
    ? other.myServices
    : other.myServices.slice(0, SERVICE_PREVIEW);
  const extra = other.myServices.slice(SERVICE_PREVIEW);
  const showOthers =
    other.otherServices.length > 0 || other.byCountry.length > 0;

  return (
    <div className="flex flex-col gap-7 px-5 pb-5 md:px-6 md:pb-6">
      {other.myServices.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          <h3 className="kicker text-small text-primary-700">
            {t("otherCountries.yourServices")}
          </h3>
          {shown.map((service) => (
            <ServiceCard
              key={service.serviceId}
              service={service}
              mark={marks.get(service.serviceId)}
            />
          ))}
          {extra.length > 0 ? (
            <button
              type="button"
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((current) => !current)}
              className={`flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-2.5 rounded-control bg-primary-200 px-3.5 py-3 text-start text-ui font-medium text-primary-800 hover:bg-primary-300 active:bg-primary-400 ${motionColor} ${focusRing}`}
            >
              <span>
                {t("otherCountries.moreServices", { count: extra.length })}
              </span>
              {extra.map((service) => {
                const mark = marks.get(service.serviceId);
                const name = mark?.name ?? "";
                return (
                  <ServiceLogo
                    key={service.serviceId}
                    name={name}
                    src={posterUrl(mark?.logoPath ?? null, "w92")}
                    size="small"
                  />
                );
              })}
              <span
                className={`ms-auto size-4 shrink-0 ${servicesOpen ? "rotate-180" : ""} chevron-turn`}
                aria-hidden="true"
              >
                <ChevronIcon />
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
      {showOthers ? (
        <div className="flex flex-col gap-3">
          <h3 className="kicker text-small text-primary-700">
            {t("otherCountries.otherServices")}
          </h3>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            {other.otherServices.map((service) => (
              <OtherServiceRow
                key={service.serviceId}
                service={service}
                mark={marks.get(service.serviceId)}
              />
            ))}
            {other.byCountry.length > 0 ? (
              <AllCountries
                count={other.byCountry.length}
                onPress={() => onViewChange("country")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ServiceCard({
  service,
  mark,
}: {
  service: MyServiceCountries;
  mark: ServiceMark | undefined;
}) {
  const t = useTranslations();
  const name = mark?.name ?? "";
  const dashed = service.countries.some((country) => country.tierOnly);

  return (
    <article className="flex flex-col gap-3.5 rounded-xl border border-primary-400 bg-surface-field p-5">
      <div className="flex items-center gap-3">
        <ServiceLogo
          name={name}
          src={posterUrl(mark?.logoPath ?? null, "w92")}
          decorative
        />
        <h4 className="service-name min-w-0 flex-1 text-primary-1000">
          {name}
        </h4>
        <p className="shrink-0 text-end text-body font-medium text-primary-800">
          {t("otherCountries.countries", { count: service.countries.length })}
        </p>
      </div>
      <CountryList countries={service.countries} />
      {dashed ? (
        <p className="text-body text-primary-800">
          {t("otherCountries.dashed")}
        </p>
      ) : null}
    </article>
  );
}

function OtherServiceRow({
  service,
  mark,
}: {
  service: MyServiceCountries;
  mark: ServiceMark | undefined;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const name = mark?.name ?? "";

  return (
    <div className="min-w-full md:min-w-56 md:flex-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md bg-primary-200 px-3 py-3 text-start hover:bg-primary-300 active:bg-primary-400 ${motionColor} ${focusRing}`}
      >
        <span className="min-w-0 flex-1 text-ui font-medium text-primary-800">
          {name}
        </span>
        <span className="shrink-0 text-body text-primary-800">
          {t("otherCountries.countries", { count: service.countries.length })}
        </span>
        <span
          className={`size-4 shrink-0 text-primary-800 ${open ? "" : "-rotate-90"} chevron-turn`}
          aria-hidden="true"
        >
          <ChevronIcon />
        </span>
      </button>
      {open ? (
        <div className="pt-2">
          <CountryList countries={service.countries} />
        </div>
      ) : null}
    </div>
  );
}

function AllCountries({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex min-h-11 min-w-full cursor-pointer items-center gap-2 rounded-md bg-primary-200 px-3 py-3 text-start hover:bg-primary-300 active:bg-primary-400 md:min-w-56 md:flex-1 ${motionColor} ${focusRing}`}
    >
      <span className="min-w-0 flex-1 text-ui font-medium text-primary-800">
        {t("otherCountries.allCountries")}
      </span>
      <span className="shrink-0 text-body text-primary-800 tabular-nums">
        {format.number(count)}
      </span>
      <span
        className="size-4 shrink-0 -rotate-90 text-primary-800"
        aria-hidden="true"
      >
        <ChevronIcon />
      </span>
    </button>
  );
}

function CountryList({ countries }: { countries: CountryTier[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const shown = open ? countries : countries.slice(0, COUNTRY_PREVIEW);
  const rest = countries.length - COUNTRY_PREVIEW;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {shown.map((tier) => (
        <CountryChip key={tier.country} tier={tier} />
      ))}
      {!open && rest > 0 ? (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={`${countryChipClass} cursor-pointer hover:bg-primary-200 ${motionColor} ${focusRing}`}
        >
          {t("otherCountries.moreCountries", { count: rest })}
        </button>
      ) : null}
    </div>
  );
}

function CountryChip({ tier }: { tier: CountryTier }) {
  const t = useTranslations();
  const name = countryName(tier.country);
  const label =
    tier.tierOnly && tier.variantLabel
      ? t("otherCountries.planChip", {
          country: name,
          plan: tier.variantLabel,
        })
      : name;

  return (
    <span
      className={`${countryChipClass} ${
        tier.tierOnly ? "border border-dashed border-primary-700" : ""
      }`}
    >
      <Flag code={tier.country} />
      {label}
    </span>
  );
}

function headlineText(
  headline: OtherCountriesHeadline,
  marks: Map<number, ServiceMark>,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (headline.kind) {
    case "your-services":
      return t("otherCountries.streaming", {
        services: headline.services,
        countries: headline.countries,
      });
    case "also-countries":
      return t("otherCountries.alsoCountries", { count: headline.countries });
    case "also-service":
      return t("otherCountries.alsoService", {
        service: marks.get(headline.serviceId)?.name ?? "",
        count: headline.countries,
      });
    case "none":
      return t("otherCountries.none");
  }
}

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
