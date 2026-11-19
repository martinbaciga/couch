import {
  getOtherCountries,
  getSituation,
  type Settings,
} from "@/lib/availability/status";
import type { Offer, TitleAvailability } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";

export type StatusLine =
  | { kind: "on-service"; country: string; serviceIds: number[] }
  | { kind: "plan-only"; country: string; serviceIds: number[] }
  | { kind: "not-on-yours"; country: string }
  | { kind: "rent-or-buy"; country: string }
  | { kind: "other-countries"; count: number }
  | { kind: "services-here"; country: string; count: number }
  | { kind: "streaming-countries"; count: number }
  | { kind: "no-data" };

export type TitleLookup = {
  availability: TitleAvailability;
  services: ServiceMark[];
};

/**
 * One line for a search row. The frames name the home country on the
 * home-country cases, and count other countries when it only streams
 * elsewhere. With no country saved, the line is the neutral count.
 */
export function searchStatusLine(
  availability: TitleAvailability,
  settings: Settings,
): StatusLine {
  const other = getOtherCountries(availability, settings);
  if (settings.country === null) {
    return other.totalCountries > 0
      ? { kind: "streaming-countries", count: other.totalCountries }
      : { kind: "no-data" };
  }

  if (!hasOffer(availability)) return { kind: "no-data" };

  const country = settings.country.toUpperCase();
  const situation = getSituation(availability, settings);
  const home = offersFor(availability, country);

  if (situation.status === "on-my-service") {
    return {
      kind: "on-service",
      country,
      serviceIds: uniqueIds(
        home.filter(
          (offer) =>
            isStreaming(offer) &&
            settings.serviceIds.includes(offer.serviceId) &&
            !isPlan(offer),
        ),
      ),
    };
  }

  if (situation.status === "specific-plan-only") {
    return {
      kind: "plan-only",
      country,
      serviceIds: uniqueIds(
        home.filter(
          (offer) =>
            isStreaming(offer) &&
            settings.serviceIds.includes(offer.serviceId) &&
            isPlan(offer),
        ),
      ),
    };
  }

  const streamingHere = home.some(isStreaming);
  if (streamingHere && situation.status === "no-services") {
    return {
      kind: "services-here",
      country,
      count: uniqueIds(home.filter(isStreaming)).length,
    };
  }
  if (streamingHere) return { kind: "not-on-yours", country };
  if (home.some((offer) => offer.type === "rent" || offer.type === "buy")) {
    return { kind: "rent-or-buy", country };
  }
  if (other.totalCountries > 0) {
    return { kind: "other-countries", count: other.totalCountries };
  }
  return { kind: "not-on-yours", country };
}

/** Null when the title response cannot be read. The row then stays blank. */
export function parseTitleLookup(value: unknown): TitleLookup | null {
  if (!isRecord(value) || !isRecord(value.availability)) return null;
  const availability = parseAvailability(value.availability);
  if (!availability) return null;
  return {
    availability,
    services: parseServices(value.services),
  };
}

function parseAvailability(
  value: Record<string, unknown>,
): TitleAvailability | null {
  if (typeof value.fetchedAt !== "string" || !isRecord(value.countries)) {
    return null;
  }
  const countries: Record<string, Offer[]> = {};
  for (const [code, offers] of Object.entries(value.countries)) {
    if (!Array.isArray(offers)) return null;
    const parsed: Offer[] = [];
    for (const offer of offers) {
      const next = parseOffer(offer);
      if (!next) return null;
      parsed.push(next);
    }
    countries[code] = parsed;
  }
  return { countries, fetchedAt: value.fetchedAt };
}

function parseOffer(value: unknown): Offer | null {
  if (!isRecord(value)) return null;
  if (
    value.type !== "stream" &&
    value.type !== "ads" &&
    value.type !== "free" &&
    value.type !== "rent" &&
    value.type !== "buy"
  ) {
    return null;
  }
  if (!isId(value.serviceId) || !isId(value.providerId)) return null;
  const offer: Offer = {
    type: value.type,
    serviceId: value.serviceId,
    providerId: value.providerId,
  };
  if (
    value.variant === "ads" ||
    value.variant === "tier" ||
    value.variant === "channel"
  ) {
    offer.variant = value.variant;
  }
  if (typeof value.variantLabel === "string")
    offer.variantLabel = value.variantLabel;
  return offer;
}

function parseServices(value: unknown): ServiceMark[] {
  if (!Array.isArray(value)) return [];
  const services: ServiceMark[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isId(item.id) || typeof item.name !== "string") {
      continue;
    }
    if (item.logoPath !== null && typeof item.logoPath !== "string") continue;
    services.push({
      id: item.id,
      name: item.name,
      logoPath: item.logoPath ?? null,
    });
  }
  return services;
}

function offersFor(availability: TitleAvailability, country: string): Offer[] {
  const direct = availability.countries[country];
  if (direct) return direct;
  const match = Object.entries(availability.countries).find(
    ([key]) => key.toUpperCase() === country,
  );
  return match?.[1] ?? [];
}

function hasOffer(availability: TitleAvailability): boolean {
  return Object.values(availability.countries).some(
    (offers) => offers.length > 0,
  );
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

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
