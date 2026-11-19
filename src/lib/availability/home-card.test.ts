import { describe, expect, it } from "vitest";
import { homeCardModel } from "@/lib/availability/home-card";
import type { Offer, TitleAvailability } from "@/lib/availability/types";
import type { Settings } from "@/lib/availability/status";

const fetchedAt = "2026-11-16T12:00:00.000Z";

function offer(
  fields: Pick<Offer, "type" | "serviceId"> & Partial<Offer>,
): Offer {
  return { providerId: fields.serviceId, ...fields };
}

function availability(countries: Record<string, Offer[]>): TitleAvailability {
  return { countries, fetchedAt };
}

function settings(country: string | null, serviceIds: number[] = []): Settings {
  return { country, serviceIds };
}

const netflix = offer({ type: "stream", serviceId: 8 });
const netflixAds = offer({
  type: "stream",
  serviceId: 8,
  variant: "ads",
  variantLabel: "with ads",
});
const premium = offer({
  type: "stream",
  serviceId: 531,
  variant: "tier",
  variantLabel: "Premium",
});
const disney = offer({ type: "stream", serviceId: 337 });
const free = offer({ type: "free", serviceId: 191 });
const rent = offer({ type: "rent", serviceId: 10 });
const buy = offer({ type: "buy", serviceId: 2 });

describe("homeCardModel", () => {
  it("asks for a country when none is saved", () => {
    expect(
      homeCardModel(availability({ US: [netflix] }), settings(null, [8])),
    ).toEqual({ kind: "no-settings" });
  });

  it("reports no data only once a country and services are set", () => {
    expect(homeCardModel(availability({}), settings("IE", [8]))).toEqual({
      kind: "no-data",
    });
  });

  it("lists every streaming service at home when none are chosen", () => {
    expect(
      homeCardModel(
        availability({ IE: [netflix, free, rent], US: [disney] }),
        settings("IE"),
      ),
    ).toEqual({ kind: "no-services", serviceIds: [8, 191] });
  });

  it("names the services the user can stream, and skips a plan-only duplicate", () => {
    expect(
      homeCardModel(
        availability({ IE: [netflix, netflixAds, disney] }),
        settings("IE", [8]),
      ),
    ).toEqual({ kind: "on-service", serviceIds: [8] });
  });

  it("keeps the plan notes when the title is only on a specific plan", () => {
    expect(
      homeCardModel(
        availability({ IE: [premium, netflixAds] }),
        settings("IE", [8, 531]),
      ),
    ).toEqual({
      kind: "plan-only",
      serviceIds: [531, 8],
      plans: [
        { variant: "tier", variantLabel: "Premium" },
        { variant: "ads", variantLabel: "with ads" },
      ],
    });
  });

  it("counts free and stream offers that are not on the user's list", () => {
    expect(
      homeCardModel(
        availability({ IE: [disney, free, rent] }),
        settings("IE", [8]),
      ),
    ).toEqual({ kind: "other-services", serviceIds: [337, 191] });
  });

  it("keeps rent and buy when nothing streams at home", () => {
    expect(
      homeCardModel(
        availability({ IE: [rent, buy, rent], US: [netflix] }),
        settings("IE", [8]),
      ),
    ).toEqual({
      kind: "not-here",
      rentIds: [10],
      buyIds: [2],
      missing: false,
    });
  });

  it("explains a home country the source does not list", () => {
    expect(
      homeCardModel(availability({ US: [netflix] }), settings("IE", [8])),
    ).toEqual({
      kind: "not-here",
      rentIds: [],
      buyIds: [],
      missing: true,
    });
  });

  it("omits an empty rent or buy row", () => {
    expect(
      homeCardModel(
        availability({ IE: [rent], US: [netflix] }),
        settings("IE", [8]),
      ),
    ).toEqual({
      kind: "not-here",
      rentIds: [10],
      buyIds: [],
      missing: false,
    });
  });
});
