"use client";

import { useId } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import {
  homeCardModel,
  type HomeCardModel,
} from "@/lib/availability/home-card";
import type { PlanNote, Settings } from "@/lib/availability/status";
import type { TitleAvailability } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import { posterUrl } from "@/lib/tmdb/poster";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

type HomeCardProps = {
  availability: TitleAvailability;
  settings: Settings;
  services: ServiceMark[];
};

/** "In [home country]", one variant from `homeCardModel`. */
export function HomeCard({ availability, settings, services }: HomeCardProps) {
  const t = useTranslations();
  const format = useFormatter();
  const headingId = useId();
  const model = homeCardModel(availability, settings);
  const marks = new Map(services.map((service) => [service.id, service]));
  const country =
    settings.country === null ? "" : countryName(settings.country);
  const dark =
    model.kind === "other-services" ||
    model.kind === "not-here" ||
    model.kind === "no-services";
  const surface = dark
    ? "bg-primary-1000"
    : model.kind === "plan-only"
      ? "border-plan bg-surface-card"
      : "border border-border-default bg-surface-card";
  const eyebrow = dark ? "text-primary-100" : "text-primary-700";
  const heading = dark ? "text-primary-100" : "text-text-default";
  const detail = dark ? "text-text-on-inverse" : "text-text-muted";
  const headline = headlineText(model, country, marks, t, format);
  const detailText = detailTextFor(model, country, t, format);
  const logosBeside =
    model.kind === "on-service" || model.kind === "plan-only"
      ? model.serviceIds
      : [];
  const logosBelow =
    model.kind === "other-services" || model.kind === "no-services"
      ? model.serviceIds
      : [];

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col gap-4.5 rounded-panel p-6 ${surface}`}
    >
      <div className="flex flex-col gap-2.5">
        {model.kind === "no-settings" ? (
          <p className={`kicker text-body ${eyebrow}`}>
            {t("homeCard.yourCountry")}
          </p>
        ) : null}
        {model.kind !== "no-settings" && model.kind !== "no-data" ? (
          <p
            className={`kicker flex items-center gap-1.5 text-body ${eyebrow}`}
          >
            <Flag code={settings.country ?? ""} />
            {t("homeCard.inCountry", { country })}
          </p>
        ) : null}
        <div
          className={`flex items-center gap-3 ${model.kind === "no-data" ? "" : "pt-2.5"}`}
        >
          {logosBeside.length > 0 ? (
            <LogoRow ids={logosBeside} marks={marks} />
          ) : null}
          <h2
            id={headingId}
            className={`message-title min-w-0 flex-1 ${heading}`}
          >
            {headline}
          </h2>
        </div>
        {logosBelow.length > 0 ? (
          <LogoRow ids={logosBelow} marks={marks} />
        ) : null}
        {detailText ? (
          <p className={`text-body ${detail}`}>{detailText}</p>
        ) : null}
      </div>
      {model.kind === "not-here" && !model.missing ? (
        <OtherWays model={model} marks={marks} />
      ) : null}
      {model.kind === "no-settings" ? (
        <Button href="/settings" className="self-start">
          {t("homeCard.setCountry")}
        </Button>
      ) : null}
      {model.kind === "no-services" ? (
        <Button tone="inverse" href="/settings" className="self-start">
          {t("homeCard.setServices")}
        </Button>
      ) : null}
    </section>
  );
}

function LogoRow({
  ids,
  marks,
}: {
  ids: number[];
  marks: Map<number, ServiceMark>;
}) {
  return (
    <ul className="flex shrink-0 flex-wrap gap-2.5">
      {ids.map((id) => {
        const mark = marks.get(id);
        const name = mark?.name ?? "";
        return (
          <li key={id}>
            <ServiceLogo
              name={name}
              src={posterUrl(mark?.logoPath ?? null, "w92")}
            />
          </li>
        );
      })}
    </ul>
  );
}

function OtherWays({
  model,
  marks,
}: {
  model: Extract<HomeCardModel, { kind: "not-here" }>;
  marks: Map<number, ServiceMark>;
}) {
  const t = useTranslations();
  const rows = [
    model.rentIds.length > 0
      ? { key: "rent", label: t("offers.rent"), ids: model.rentIds }
      : null,
    model.buyIds.length > 0
      ? { key: "buy", label: t("offers.buy"), ids: model.buyIds }
      : null,
  ].filter((row) => row !== null);

  return (
    <>
      <div className="h-px bg-primary-100" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <p className="shrink-0 text-body font-medium text-primary-100 md:w-36">
          {t("homeCard.otherWays")}
        </p>
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-col gap-1">
              <p className="text-small text-primary-200">{row.label}</p>
              <p className="text-ui text-primary-100">
                {namesFor(row.ids, marks).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function headlineText(
  model: HomeCardModel,
  country: string,
  marks: Map<number, ServiceMark>,
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): string {
  if (model.kind === "no-settings") return t("homeCard.whichCountry");
  if (model.kind === "no-data") return t("homeCard.noData");
  if (model.kind === "no-services") {
    return t("homeCard.streamingCount", {
      count: model.serviceIds.length,
      country,
    });
  }
  if (model.kind === "on-service") {
    return t("homeCard.onService", {
      service: listed(namesFor(model.serviceIds, marks), format),
    });
  }
  if (model.kind === "plan-only") {
    return t("homeCard.planOnly", {
      service: listed(namesFor(model.serviceIds, marks), format),
    });
  }
  return t("homeCard.notOnYours");
}

function detailTextFor(
  model: HomeCardModel,
  country: string,
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): string | null {
  if (model.kind === "on-service") return t("homeCard.withSubscription");
  if (model.kind === "plan-only") {
    return t("homeCard.planDetail", {
      plans: listed(
        model.plans.map((plan) => planPhrase(plan, t)),
        format,
      ),
    });
  }
  if (model.kind === "other-services") {
    return t("homeCard.otherServices", { count: model.serviceIds.length });
  }
  if (model.kind === "not-here") {
    return model.missing ? t("homeCard.noStreamData", { country }) : null;
  }
  if (model.kind === "no-data") return t("homeCard.noDataBody");
  if (model.kind === "no-settings") return t("homeCard.pickCountry");
  return t("homeCard.unsetServices");
}

function planPhrase(
  plan: PlanNote,
  t: ReturnType<typeof useTranslations>,
): string {
  if (plan.variant === "ads" || plan.variantLabel === "with ads") {
    return t("homeCard.planAds");
  }
  return t("homeCard.planTier", { plan: plan.variantLabel });
}

function namesFor(ids: number[], marks: Map<number, ServiceMark>): string[] {
  return ids
    .map((id) => marks.get(id)?.name ?? "")
    .filter((name) => name.length > 0);
}

function listed(
  names: string[],
  format: ReturnType<typeof useFormatter>,
): string {
  return format.list(names, { type: "conjunction" });
}

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
