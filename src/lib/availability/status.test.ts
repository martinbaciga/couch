import { describe, expect, it } from "vitest";

import {
  getHomeDetails,
  getOtherCountries,
  getSituation,
  getWatchlistCategory,
  otherCountriesHeadline,
  type Settings,
  type Situation,
  type WatchlistCategory,
} from "@/lib/availability/status";
import type { Offer, TitleAvailability } from "@/lib/availability/types";

const FETCHED_AT = "2026-11-16T12:00:00.000Z";

function offer(
  fields: Pick<Offer, "type" | "serviceId"> & Partial<Offer>,
): Offer {
  return { providerId: fields.serviceId, ...fields };
}

function availability(countries: Record<string, Offer[]>): TitleAvailability {
  return { countries, fetchedAt: FETCHED_AT };
}

function chosen(country: string | null, serviceIds: number[] = []): Settings {
  return { country, serviceIds };
}

const netflix = offer({ type: "stream", serviceId: 8 });
const netflixAds = offer({
  type: "stream",
  serviceId: 8,
  variant: "ads",
  variantLabel: "with ads",
});
const paramountPremium = offer({
  type: "stream",
  serviceId: 531,
  variant: "tier",
  variantLabel: "Premium",
});
const channel = offer({
  type: "stream",
  serviceId: 201,
  variant: "channel",
  variantLabel: "via Amazon",
});
const disney = offer({ type: "stream", serviceId: 337 });
const free = offer({ type: "free", serviceId: 191 });
const adsBucket = offer({ type: "ads", serviceId: 15 });
const rent = offer({ type: "rent", serviceId: 10 });
const buy = offer({ type: "buy", serviceId: 2 });

describe("getSituation", () => {
  it.each<{
    name: string;
    countries: Record<string, Offer[]>;
    settings: Settings;
    situation: Situation;
  }>([
    {
      name: "services set with no country",
      countries: { US: [netflix] },
      settings: chosen(null, [8]),
      situation: { status: "no-settings" },
    },
    {
      name: "country set with no services",
      countries: { IE: [netflix, rent] },
      settings: chosen("IE"),
      situation: { status: "no-services" },
    },
    {
      name: "country set, no services, and no offers",
      countries: {},
      settings: chosen("IE"),
      situation: { status: "no-services" },
    },
    {
      name: "empty data",
      countries: {},
      settings: chosen("IE", [8]),
      situation: { status: "no-data" },
    },
    {
      name: "a plain offer on a selected service",
      countries: { IE: [netflix, netflixAds] },
      settings: chosen("IE", [8]),
      situation: { status: "on-my-service" },
    },
    {
      name: "a selected channel",
      countries: { IE: [channel] },
      settings: chosen("IE", [201]),
      situation: { status: "on-my-service" },
    },
    {
      name: "only the plan with ads",
      countries: { IE: [netflixAds] },
      settings: chosen("ie", [8]),
      situation: {
        status: "specific-plan-only",
        plans: [{ variant: "ads", variantLabel: "with ads" }],
      },
    },
    {
      name: "only premium and the plan with ads",
      countries: { IE: [paramountPremium, netflixAds, netflixAds] },
      settings: chosen("IE", [8, 531]),
      situation: {
        status: "specific-plan-only",
        plans: [
          { variant: "tier", variantLabel: "Premium" },
          { variant: "ads", variantLabel: "with ads" },
        ],
      },
    },
    {
      name: "a channel that is not selected",
      countries: { IE: [channel] },
      settings: chosen("IE", [8]),
      situation: { status: "on-other-services-here" },
    },
    {
      name: "streaming on another service at home",
      countries: { IE: [disney, free] },
      settings: chosen("IE", [8]),
      situation: { status: "on-other-services-here" },
    },
    {
      name: "rent only at home",
      countries: { IE: [rent], US: [netflix] },
      settings: chosen("IE", [8, 10]),
      situation: { status: "not-on-my-services" },
    },
    {
      name: "home country missing from the data",
      countries: { US: [netflix] },
      settings: chosen("IE", [8]),
      situation: { status: "not-on-my-services" },
    },
    {
      name: "a country code outside the region list",
      countries: { GG: [netflix] },
      settings: chosen("GG", [8]),
      situation: { status: "on-my-service" },
    },
  ])("$name", ({ countries, settings, situation }) => {
    expect(getSituation(availability(countries), settings)).toEqual(situation);
  });
});

describe("getHomeDetails", () => {
  it("splits the home country and leaves out every other country", () => {
    const details = getHomeDetails(
      availability({
        IE: [netflix, disney, free, adsBucket, rent, buy],
        US: [netflix],
      }),
      chosen("IE", [8]),
    );

    expect(details).toEqual({
      streamOnMyServices: [netflix],
      streamOnOtherServices: [disney],
      freeOrAds: [free, adsBucket],
      rent: [rent],
      buy: [buy],
    });
  });

  it("lists every home provider when no services are selected", () => {
    const details = getHomeDetails(
      availability({ IE: [netflix, disney] }),
      chosen("IE"),
    );

    expect(details.streamOnMyServices).toEqual([]);
    expect(details.streamOnOtherServices).toEqual([netflix, disney]);
  });

  it("is empty when the country is not set", () => {
    const details = getHomeDetails(
      availability({ IE: [netflix] }),
      chosen(null, [8]),
    );

    expect(details.streamOnMyServices).toEqual([]);
    expect(details.rent).toEqual([]);
  });
});

describe("getOtherCountries", () => {
  it("sorts services and countries and keeps an unknown region code", () => {
    const disneyPremium = offer({
      type: "stream",
      serviceId: 337,
      variant: "tier",
      variantLabel: "Premium",
    });
    const result = getOtherCountries(
      availability({
        IE: [netflix],
        US: [netflix, disneyPremium],
        DE: [netflix],
        GG: [netflix],
        FR: [disney, channel],
        AU: [free],
        JP: [rent],
      }),
      chosen("IE", [8, 337, 119]),
    );

    expect(result.myServices).toEqual([
      {
        serviceId: 8,
        countries: [
          { country: "DE", tierOnly: false },
          { country: "GG", tierOnly: false },
          { country: "US", tierOnly: false },
        ],
      },
      {
        serviceId: 337,
        countries: [
          { country: "FR", tierOnly: false },
          { country: "US", tierOnly: true, variantLabel: "Premium" },
        ],
      },
    ]);
    expect(result.otherServices).toEqual([
      {
        serviceId: 191,
        countryCount: 1,
        countries: [{ country: "AU", tierOnly: false }],
      },
      {
        serviceId: 201,
        countryCount: 1,
        countries: [{ country: "FR", tierOnly: false }],
      },
    ]);
    expect(result.byCountry.map((row) => row.country)).toEqual([
      "FR",
      "DE",
      "GG",
      "US",
      "AU",
      "JP",
    ]);
    expect(result.byCountry.map((row) => row.hasMyService)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(result.byCountry[5]?.offersByType.rent).toEqual([rent]);
    expect(result.totalCountries).toBe(5);
    expect(result.myServicesCountryCount).toBe(4);
  });

  it("treats every service as someone else's when none are selected", () => {
    const result = getOtherCountries(
      availability({ US: [netflix] }),
      chosen("IE"),
    );

    expect(result.myServices).toEqual([]);
    expect(result.otherServices.map((service) => service.serviceId)).toEqual([
      8,
    ]);
    expect(result.byCountry[0]?.hasMyService).toBe(false);
    expect(result.totalCountries).toBe(1);
    expect(result.myServicesCountryCount).toBe(0);
  });
});

describe("getWatchlistCategory", () => {
  it.each<{
    name: string;
    countries: Record<string, Offer[]>;
    settings: Settings;
    category: WatchlistCategory;
  }>([
    {
      name: "on your services",
      countries: { IE: [netflix] },
      settings: chosen("IE", [8]),
      category: { category: "on-my-services-here", planOnly: false },
    },
    {
      name: "on your services, plan only",
      countries: { IE: [netflixAds] },
      settings: chosen("IE", [8]),
      category: { category: "on-my-services-here", planOnly: true },
    },
    {
      name: "streaming here when no services are selected",
      countries: { IE: [netflix, free] },
      settings: chosen("IE"),
      category: { category: "streaming-here" },
    },
    {
      name: "free or with ads",
      countries: { IE: [free, disney] },
      settings: chosen("IE", [8]),
      category: { category: "free-or-ads-here" },
    },
    {
      name: "free or with ads when no services are selected",
      countries: { IE: [adsBucket] },
      settings: chosen("IE"),
      category: { category: "free-or-ads-here" },
    },
    {
      name: "on other services",
      countries: { IE: [disney] },
      settings: chosen("IE", [8]),
      category: { category: "other-services-here" },
    },
    {
      name: "rent or buy only",
      countries: { IE: [rent, buy], US: [netflix] },
      settings: chosen("IE", [8]),
      category: { category: "rent-or-buy-here-only" },
    },
    {
      name: "other countries only",
      countries: { US: [buy] },
      settings: chosen("IE", [8]),
      category: { category: "other-countries-only" },
    },
    {
      name: "other countries when the country is not set",
      countries: { GG: [rent] },
      settings: chosen(null, [8]),
      category: { category: "other-countries-only" },
    },
    {
      name: "no data",
      countries: {},
      settings: chosen("IE", [8]),
      category: { category: "no-data" },
    },
  ])("$name", ({ countries, settings, category }) => {
    expect(getWatchlistCategory(availability(countries), settings)).toEqual(
      category,
    );
  });
});

describe("otherCountriesHeadline", () => {
  it("counts your services and the countries they cover", () => {
    const data = availability({
      IE: [rent],
      DE: [netflix],
      FR: [netflix, disney],
    });
    const settings = chosen("IE", [8, 337]);
    expect(
      otherCountriesHeadline(
        getSituation(data, settings),
        getOtherCountries(data, settings),
      ),
    ).toEqual({ kind: "your-services", services: 2, countries: 2 });
  });

  it("uses the also-streaming headline when it already streams at home", () => {
    const data = availability({ IE: [netflix], DE: [netflix], FR: [disney] });
    const settings = chosen("IE", [8]);
    expect(
      otherCountriesHeadline(
        getSituation(data, settings),
        getOtherCountries(data, settings),
      ),
    ).toEqual({ kind: "also-countries", countries: 2 });
  });

  it("names the service when a specific plan is the only one of yours elsewhere", () => {
    const data = availability({
      IE: [netflixAds],
      DE: [disney],
      FR: [disney],
      US: [paramountPremium],
    });
    const settings = chosen("IE", [8, 337]);
    expect(
      otherCountriesHeadline(
        getSituation(data, settings),
        getOtherCountries(data, settings),
      ),
    ).toEqual({ kind: "also-service", serviceId: 337, countries: 2 });
  });

  it("counts every other country when a specific plan has several of your services elsewhere", () => {
    const data = availability({
      IE: [netflixAds],
      DE: [disney],
      FR: [paramountPremium],
    });
    const settings = chosen("IE", [8, 337, 531]);
    expect(
      otherCountriesHeadline(
        getSituation(data, settings),
        getOtherCountries(data, settings),
      ),
    ).toEqual({ kind: "also-countries", countries: 2 });
  });

  it("says none of your services when only other services have it", () => {
    const data = availability({ IE: [rent], US: [disney] });
    const settings = chosen("IE", [8]);
    expect(
      otherCountriesHeadline(
        getSituation(data, settings),
        getOtherCountries(data, settings),
      ),
    ).toEqual({ kind: "none" });
  });
});
