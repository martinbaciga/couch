"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Flag } from "@/components/ui/Flag";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import type { CountryRow, Settings } from "@/lib/availability/status";
import type { Offer } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import { posterUrl } from "@/lib/tmdb/poster";
import {
  hiddenCount,
  previewRows,
  rowsForFilter,
  storeNames,
  streamLogoMarks,
  type CountryOfferFilter,
} from "./country-view";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

type CountryTableProps = {
  rows: CountryRow[];
  marks: Map<number, ServiceMark>;
  settings: Settings;
  /**
   * Offer-type chips and the services-first note.
   * Off when no country or no services are set.
   */
  filtered?: boolean;
};

/**
 * Every other country, in `getOtherCountries().byCountry` order.
 * `filtered` is the By country toggle. Otherwise the list is the only view.
 */
export function CountryTable({
  rows,
  marks,
  settings,
  filtered = false,
}: CountryTableProps) {
  const t = useTranslations();
  const [filter, setFilter] = useState<CountryOfferFilter>("stream");
  const [open, setOpen] = useState(false);
  const visible = filtered ? rowsForFilter(rows, filter) : rows;
  const shown = previewRows(visible, open);
  const extra = hiddenCount(visible.length, open);

  function selectFilter(next: CountryOfferFilter) {
    setFilter(next);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 md:px-6 md:pb-6">
      {filtered ? (
        <div
          role="group"
          aria-label={t("otherCountries.offerType")}
          className="flex flex-wrap gap-2"
        >
          <Chip
            pressed={filter === "stream"}
            onPressedChange={(pressed) => {
              if (pressed) selectFilter("stream");
            }}
          >
            {t("offers.stream")}
          </Chip>
          <Chip
            pressed={filter === "free"}
            onPressedChange={(pressed) => {
              if (pressed) selectFilter("free");
            }}
          >
            {t("offers.freeAds")}
          </Chip>
          <Chip
            pressed={filter === "rent-buy"}
            onPressedChange={(pressed) => {
              if (pressed) selectFilter("rent-buy");
            }}
          >
            {t("offers.rentBuy")}
          </Chip>
        </div>
      ) : null}
      {shown.length > 0 ? (
        <>
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
          <table className="hidden w-full table-fixed border-collapse text-start md:table">
            <colgroup>
              <col className="w-1/4" />
              <col className="w-1/4" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-border-subtle">
                <th
                  scope="col"
                  className="kicker py-2.5 pe-3 text-start text-body font-medium text-text-muted"
                >
                  {t("offers.country")}
                </th>
                <th
                  scope="col"
                  className="kicker py-2.5 pe-3 text-start text-body font-medium text-text-muted"
                >
                  {t("offers.stream")}
                </th>
                <th
                  scope="col"
                  className="kicker py-2.5 pe-3 text-start text-body font-medium text-text-muted"
                >
                  {t("offers.freeAds")}
                </th>
                <th
                  scope="col"
                  className="kicker py-2.5 pe-3 text-start text-body font-medium text-text-muted"
                >
                  {t("offers.rent")}
                </th>
                <th
                  scope="col"
                  className="kicker py-2.5 text-start text-body font-medium text-text-muted"
                >
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
        </>
      ) : null}
      {filtered ? (
        <p className="text-caption text-text-muted">
          {t("otherCountries.groupedHint")}
        </p>
      ) : null}
      {extra > 0 ? (
        <Button
          variant="secondary"
          size="small"
          onClick={() => setOpen(true)}
          className="self-start"
        >
          {t("otherCountries.showCountries", { count: extra })}
        </Button>
      ) : null}
      {filtered ? null : (
        <p className="text-body text-text-muted">
          {t("otherCountries.ungroupedHint")}
        </p>
      )}
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
    <li className="flex flex-col gap-2.5 border-b border-border-subtle py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={row.country} />
          <p className="min-w-0 text-ui font-medium break-words text-text-default">
            {countryName(row.country)}
          </p>
        </div>
        {crowded ? null : <LogoList logos={logos} wrap={false} />}
      </div>
      {crowded ? <LogoList logos={logos} /> : null}
      <div className="grid grid-cols-3 gap-3">
        <StoreColumn
          label={t("offers.freeOrAds")}
          names={namesFor(
            [...row.offersByType.free, ...row.offersByType.ads],
            marks,
          )}
        />
        <StoreColumn
          label={t("offers.rent")}
          names={namesFor(row.offersByType.rent, marks)}
        />
        <StoreColumn
          label={t("offers.buy")}
          names={namesFor(row.offersByType.buy, marks)}
        />
      </div>
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
    <tr className="border-b border-border-subtle">
      <th
        scope="row"
        className="py-3.5 pe-3 text-start align-middle font-medium"
      >
        <span className="flex items-center gap-2">
          <Flag code={row.country} />
          <span className="min-w-0 text-ui break-words text-text-default">
            {countryName(row.country)}
          </span>
        </span>
      </th>
      <td className="py-3.5 pe-3 align-middle">
        <LogoList logos={streamLogos(row, marks, settings)} />
      </td>
      <td className="py-3.5 pe-3 align-middle text-body">
        <NameList
          names={namesFor(
            [...row.offersByType.free, ...row.offersByType.ads],
            marks,
          )}
        />
      </td>
      <td className="py-3.5 pe-3 align-middle text-body">
        <NameList names={namesFor(row.offersByType.rent, marks)} />
      </td>
      <td className="py-3.5 align-middle text-body">
        <NameList names={namesFor(row.offersByType.buy, marks)} />
      </td>
    </tr>
  );
}

function StoreColumn({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-small text-text-muted">{label}</p>
      <NameList names={names} compact />
    </div>
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
    return (
      <span className="text-body text-text-default">
        {t("offers.noneFound")}
      </span>
    );
  }
  const visible = storeNames(names, compact);
  return (
    <span className="text-body break-words text-text-default">
      {visible.shown.join(" · ")}
      {visible.extra > 0 ? (
        <>
          {" · "}
          <span className="text-text-muted">
            {t("otherCountries.moreCountries", { count: visible.extra })}
          </span>
        </>
      ) : null}
    </span>
  );
}

type Logo = {
  id: number;
  name: string;
  src: string | null;
  marker: "none" | "mine" | "plan";
};

function LogoList({ logos, wrap = true }: { logos: Logo[]; wrap?: boolean }) {
  const t = useTranslations();
  if (logos.length === 0) {
    return (
      <span className="text-body text-text-default">
        {t("offers.noneFound")}
      </span>
    );
  }
  return (
    <ul className={`flex gap-2 ${wrap ? "flex-wrap" : "shrink-0 flex-nowrap"}`}>
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
  return streamLogoMarks(
    row.offersByType.stream,
    new Set(settings.serviceIds),
  ).map((logo) => {
    const mark = marks.get(logo.id);
    return {
      id: logo.id,
      name: mark?.name ?? "",
      src: posterUrl(mark?.logoPath ?? null, "w92"),
      marker: logo.marker,
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
