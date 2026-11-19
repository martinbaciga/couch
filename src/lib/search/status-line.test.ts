import { describe, expect, it } from "vitest";
import type { Offer, TitleAvailability } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import { parseTitleLookup, searchStatusLine } from "./status-line";

const fetchedAt = "2026-11-19T00:00:00.000Z";

function offer(
  fields: Pick<Offer, "type" | "serviceId"> & Partial<Offer>,
): Offer {
  return { providerId: fields.serviceId, ...fields };
}

function availability(countries: Record<string, Offer[]>): TitleAvailability {
  return { countries, fetchedAt };
}

const netflix = offer({ type: "stream", serviceId: 8 });
const netflixAds = offer({
  type: "stream",
  serviceId: 8,
  variant: "ads",
  variantLabel: "with ads",
});
const disney = offer({ type: "stream", serviceId: 337 });
const rent = offer({ type: "rent", serviceId: 10 });

describe("searchStatusLine", () => {
  it("names the service when it streams on one the person has", () => {
    expect(
      searchStatusLine(availability({ IE: [netflix] }), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "on-service", country: "IE", serviceIds: [8] });
  });

  it("keeps a plan-only offer separate", () => {
    expect(
      searchStatusLine(availability({ IE: [netflixAds] }), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "plan-only", country: "IE", serviceIds: [8] });
  });

  it("says it is on other services when it streams at home on a different one", () => {
    expect(
      searchStatusLine(availability({ IE: [disney] }), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "not-on-yours", country: "IE" });
  });

  it("counts the services at home when none are chosen", () => {
    expect(
      searchStatusLine(availability({ IE: [netflix, disney] }), {
        country: "IE",
        serviceIds: [],
      }),
    ).toEqual({ kind: "services-here", country: "IE", count: 2 });
  });

  it("prefers rent or buy at home over streaming somewhere else", () => {
    expect(
      searchStatusLine(availability({ IE: [rent], US: [netflix] }), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "rent-or-buy", country: "IE" });
  });

  it("counts other countries when it does not stream at home", () => {
    expect(
      searchStatusLine(availability({ US: [netflix], DE: [disney] }), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "other-countries", count: 2 });
  });

  it("counts every streaming country when no country is saved", () => {
    expect(
      searchStatusLine(availability({ US: [netflix] }), {
        country: null,
        serviceIds: [],
      }),
    ).toEqual({ kind: "streaming-countries", count: 1 });
  });

  it("is no data when nowhere has an offer", () => {
    expect(
      searchStatusLine(availability({}), {
        country: "IE",
        serviceIds: [8],
      }),
    ).toEqual({ kind: "no-data" });
    expect(
      searchStatusLine(availability({}), {
        country: null,
        serviceIds: [],
      }),
    ).toEqual({ kind: "no-data" });
  });
});

describe("parseTitleLookup", () => {
  it("reads availability and service marks", () => {
    const services: ServiceMark[] = [
      { id: 8, name: "Netflix", logoPath: "/netflix.jpg" },
    ];
    expect(
      parseTitleLookup({
        availability: availability({ IE: [netflix] }),
        services,
      }),
    ).toEqual({
      availability: availability({ IE: [netflix] }),
      services,
    });
  });

  it("returns null when the availability cannot be read", () => {
    expect(parseTitleLookup({ availability: { countries: [] } })).toBeNull();
    expect(parseTitleLookup(null)).toBeNull();
  });
});
