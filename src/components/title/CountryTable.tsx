"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import type { CountryRow, Settings } from "@/lib/availability/status";
import type { Offer } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import { posterUrl } from "@/lib/tmdb/poster";

const PREVIEW = 6;
const STORE_PREVIEW = 2;
const regionNames = new Intl.DisplayNames("en", { type: "region" });

type CountryTableProps = {
  rows: CountryRow[];
  marks: Map<number, ServiceMark>;
  settings: Settings;
};

/**
 * Every other country, ungrouped. Used when no country or no services are set.
 * The filtered by-country toggle is MAR-45.
 */
export function CountryTable({ rows, marks, settings }: CountryTableProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, PREVIEW);
  const extra = rows.length - PREVIEW;

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 md:px-6 md:pb-6">
      <ul className="flex flex-col md:hidden">
        {shown.map((row) => (
          <CountryCard
            key={row.country}
            row={row}
            marks={marks}
            settings={settings}
          />
        ))}
      </ul>
      <table className="hidden w-full border-collapse text-start md:table">
        <thead>
          <tr className="text-small text-text-muted">
            <th scope="col" className="pb-2 pe-3 text-start font-medium">
              {t("offers.country")}
            </th>
            <th scope="col" className="pb-2 pe-3 text-start font-medium">
              {t("offers.stream")}
            </th>
            <th scope="col" className="pb-2 pe-3 text-start font-medium">
              {t("offers.freeAds")}
            </th>
            <th scope="col" className="pb-2 pe-3 text-start font-medium">
              {t("offers.rent")}
            </th>
            <th scope="col" className="pb-2 text-start font-medium">
              {t("offers.buy")}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <CountryRowView
              key={row.country}
              row={row}
              marks={marks}
              settings={settings}
            />
          ))}
        </tbody>
      </table>
      {extra > 0 && !open ? (
        <Button
          variant="secondary"
          size="small"
          onClick={() => setOpen(true)}
          className="self-start"
        >
          {t("otherCountries.showCountries", { count: extra })}
        </Button>
      ) : null}
      <p className="text-body text-text-muted">
        {t("otherCountries.ungroupedHint")}
      </p>
    </div>
  );
}

function CountryCard({
  row,
  marks,
  settings,
}: {
  row: CountryRow;
  marks: Map<number, ServiceMark>;
  settings: Settings;
}) {
  const t = useTranslations();
  const logos = streamLogos(row, marks, settings);
  const crowded = logos.length >= 4;

  return (
    <li className="flex flex-col gap-3 border-b border-primary-200 py-4">
      <div
        className={crowded ? "flex flex-col gap-2" : "flex items-start gap-3"}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Flag code={row.country} />
          <p className="min-w-0 text-ui font-medium text-text-default">
            {countryName(row.country)}
          </p>
        </div>
        <LogoList logos={logos} />
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-body">
        <StoreLine
          label={t("offers.freeAds")}
          names={namesFor(
            [...row.offersByType.free, ...row.offersByType.ads],
            marks,
          )}
          compact
        />
        <StoreLine
          label={t("offers.rent")}
          names={namesFor(row.offersByType.rent, marks)}
          compact
        />
        <StoreLine
          label={t("offers.buy")}
          names={namesFor(row.offersByType.buy, marks)}
          compact
        />
      </dl>
    </li>
  );
}

function CountryRowView({
  row,
  marks,
  settings,
}: {
  row: CountryRow;
  marks: Map<number, ServiceMark>;
  settings: Settings;
}) {
  return (
    <tr className="border-t border-primary-200">
      <th scope="row" className="py-3 pe-3 text-start align-middle font-medium">
        <span className="flex items-center gap-1.5">
          <Flag code={row.country} />
          <span className="text-ui text-text-default">
            {countryName(row.country)}
          </span>
        </span>
      </th>
      <td className="py-3 pe-3 align-middle">
        <LogoList logos={streamLogos(row, marks, settings)} />
      </td>
      <td className="py-3 pe-3 align-middle text-body">
        <NameList
          names={namesFor(
            [...row.offersByType.free, ...row.offersByType.ads],
            marks,
          )}
        />
      </td>
      <td className="py-3 pe-3 align-middle text-body">
        <NameList names={namesFor(row.offersByType.rent, marks)} />
      </td>
      <td className="py-3 align-middle text-body">
        <NameList names={namesFor(row.offersByType.buy, marks)} />
      </td>
    </tr>
  );
}

function StoreLine({
  label,
  names,
  compact,
}: {
  label: string;
  names: string[];
  compact?: boolean;
}) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd>
        <NameList names={names} compact={compact} />
      </dd>
    </>
  );
}

function NameList({
  names,
  compact = false,
}: {
  names: string[];
  compact?: boolean;
}) {
  const t = useTranslations();
  if (names.length === 0) {
    return <span className="text-text-muted">{t("offers.noneFound")}</span>;
  }
  if (!compact || names.length <= STORE_PREVIEW) {
    return <span className="text-text-default">{names.join(" · ")}</span>;
  }
  const extra = names.length - STORE_PREVIEW;
  return (
    <span className="text-text-default">
      {names.slice(0, STORE_PREVIEW).join(" · ")}{" "}
      <span className="text-text-muted">
        {t("otherCountries.moreCountries", { count: extra })}
      </span>
    </span>
  );
}

type Logo = {
  id: number;
  name: string;
  src: string | null;
  marker: "none" | "mine" | "plan";
};

function LogoList({ logos }: { logos: Logo[] }) {
  const t = useTranslations();
  if (logos.length === 0) {
    return (
      <span className="text-body text-text-muted">{t("offers.noneFound")}</span>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {logos.map((logo) => (
        <li key={logo.id}>
          <ServiceLogo
            name={logo.name}
            src={logo.src}
            size="small"
            marker={logo.marker}
          />
        </li>
      ))}
    </ul>
  );
}

function streamLogos(
  row: CountryRow,
  marks: Map<number, ServiceMark>,
  settings: Settings,
): Logo[] {
  const grouped = new Map<number, Offer[]>();
  for (const offer of row.offersByType.stream) {
    const list = grouped.get(offer.serviceId) ?? [];
    list.push(offer);
    grouped.set(offer.serviceId, list);
  }
  const mine = new Set(settings.serviceIds);
  return [...grouped.entries()].map(([id, offers]) => {
    const mark = marks.get(id);
    const plan = offers.every(
      (offer) => offer.variant === "ads" || offer.variant === "tier",
    );
    let marker: Logo["marker"] = "none";
    if (plan) marker = "plan";
    else if (mine.has(id)) marker = "mine";
    return {
      id,
      name: mark?.name ?? "",
      src: posterUrl(mark?.logoPath ?? null, "w92"),
      marker,
    };
  });
}

function namesFor(offers: Offer[], marks: Map<number, ServiceMark>): string[] {
  const names: string[] = [];
  const seen = new Set<number>();
  for (const offer of offers) {
    if (seen.has(offer.serviceId)) continue;
    seen.add(offer.serviceId);
    const name = marks.get(offer.serviceId)?.name;
    if (name) names.push(name);
  }
  return names;
}

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
