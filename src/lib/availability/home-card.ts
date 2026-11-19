import {
  getSituation,
  type PlanNote,
  type Settings,
} from "@/lib/availability/status";
import type { Offer, TitleAvailability } from "@/lib/availability/types";

export type HomeCardModel =
  | { kind: "no-settings" }
  | { kind: "no-data" }
  | { kind: "no-services"; serviceIds: number[] }
  | { kind: "on-service"; serviceIds: number[] }
  | { kind: "plan-only"; serviceIds: number[]; plans: PlanNote[] }
  | { kind: "other-services"; serviceIds: number[] }
  | {
      kind: "not-here";
      rentIds: number[];
      buyIds: number[];
      /** Home has no rent or buy row, so the card explains the gap. */
      missing: boolean;
    };

/**
 * What the home card renders for `getSituation`. Streaming includes stream,
 * free and ads, because a free or ads offer is still streaming here.
 * Rent and buy stay out of the service rows.
 */
export function homeCardModel(
  availability: TitleAvailability,
  settings: Settings,
): HomeCardModel {
  const situation = getSituation(availability, settings);
  if (situation.status === "no-settings") return { kind: "no-settings" };
  if (situation.status === "no-data") return { kind: "no-data" };

  const home =
    settings.country === null
      ? null
      : homeOffers(availability, settings.country);
  const offers = home ?? [];

  if (situation.status === "no-services") {
    return {
      kind: "no-services",
      serviceIds: uniqueIds(offers.filter(isStreaming)),
    };
  }

  const mine = new Set(settings.serviceIds);
  if (situation.status === "on-my-service") {
    return {
      kind: "on-service",
      serviceIds: uniqueIds(
        offers.filter(
          (offer) =>
            isStreaming(offer) && mine.has(offer.serviceId) && !isPlan(offer),
        ),
      ),
    };
  }

  if (situation.status === "specific-plan-only") {
    return {
      kind: "plan-only",
      serviceIds: uniqueIds(
        offers.filter(
          (offer) =>
            isStreaming(offer) && mine.has(offer.serviceId) && isPlan(offer),
        ),
      ),
      plans: situation.plans,
    };
  }

  if (situation.status === "on-other-services-here") {
    return {
      kind: "other-services",
      serviceIds: uniqueIds(
        offers.filter(
          (offer) => isStreaming(offer) && !mine.has(offer.serviceId),
        ),
      ),
    };
  }

  const rentIds = uniqueIds(offers.filter((offer) => offer.type === "rent"));
  const buyIds = uniqueIds(offers.filter((offer) => offer.type === "buy"));
  return {
    kind: "not-here",
    rentIds,
    buyIds,
    missing: rentIds.length === 0 && buyIds.length === 0,
  };
}

/** Null when the country is absent. An empty list means the source had nothing. */
function homeOffers(
  availability: TitleAvailability,
  country: string,
): Offer[] | null {
  const code = country.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(availability.countries, code)) {
    return availability.countries[code] ?? [];
  }
  const match = Object.entries(availability.countries).find(
    ([key]) => key.toUpperCase() === code,
  );
  return match ? match[1] : null;
}

function isStreaming(offer: Offer): boolean {
  return (
    offer.type === "stream" || offer.type === "ads" || offer.type === "free"
  );
}

function isPlan(offer: Offer): boolean {
  return offer.variant === "ads" || offer.variant === "tier";
}

function uniqueIds(offers: Offer[]): number[] {
  const ids: number[] = [];
  for (const offer of offers) {
    if (!ids.includes(offer.serviceId)) ids.push(offer.serviceId);
  }
  return ids;
}
