import { describe, expect, it } from "vitest";

import { normalizeProviders } from "@/lib/availability/normalize";
import type { WatchProvider, WatchProviders } from "@/lib/tmdb/types";

const FETCHED_AT = "2026-11-16T12:00:00.000Z";

function provider(providerId: number, providerName: string): WatchProvider {
  return {
    providerId,
    providerName,
    logoPath: null,
    displayPriority: 1,
  };
}

function raw(results: WatchProviders["results"]): WatchProviders {
  return { id: 550, results, fetchedAt: FETCHED_AT };
}

describe("normalizeProviders", () => {
  it("maps every offer type and keeps an unknown country code", () => {
    const availability = normalizeProviders(
      raw({
        IE: {
          link: "https://www.themoviedb.org/movie/550/watch?locale=IE",
          flatrate: [provider(8, "Netflix")],
          ads: [provider(15, "Hulu")],
          free: [provider(191, "Kanopy")],
          rent: [provider(10, "Amazon Video")],
          buy: [provider(2, "Apple TV Store")],
        },
        GG: {
          link: "https://www.themoviedb.org/movie/550/watch?locale=GG",
          free: [provider(191, "Kanopy")],
        },
      }),
      FETCHED_AT,
    );

    expect(availability.fetchedAt).toBe(FETCHED_AT);
    expect(availability.countries.IE).toEqual([
      { type: "stream", serviceId: 8, providerId: 8 },
      { type: "ads", serviceId: 15, providerId: 15 },
      { type: "free", serviceId: 191, providerId: 191 },
      { type: "rent", serviceId: 10, providerId: 10 },
      { type: "buy", serviceId: 2, providerId: 2 },
    ]);
    expect(availability.countries.GG).toEqual([
      { type: "free", serviceId: 191, providerId: 191 },
    ]);
    expect(availability.countries.US).toBeUndefined();
  });

  it("records a tier, a channel, and an ads plan", () => {
    const availability = normalizeProviders(
      raw({
        US: {
          link: "https://example.test/us",
          flatrate: [
            provider(2303, "Paramount Plus Premium"),
            provider(201, "MUBI Amazon Channel"),
            provider(1796, "Netflix Standard with Ads"),
          ],
        },
      }),
      FETCHED_AT,
    );

    expect(availability.countries.US).toEqual([
      {
        type: "stream",
        serviceId: 531,
        providerId: 2303,
        variant: "tier",
        variantLabel: "Premium",
      },
      {
        type: "stream",
        serviceId: 201,
        providerId: 201,
        variant: "channel",
        variantLabel: "via Amazon",
      },
      {
        type: "stream",
        serviceId: 8,
        providerId: 1796,
        variant: "ads",
        variantLabel: "with ads",
      },
    ]);
  });

  it("merges the same service and keeps the plain offer when one exists", () => {
    const availability = normalizeProviders(
      raw({
        US: {
          link: "https://example.test/us",
          flatrate: [
            provider(1796, "Netflix Standard with Ads"),
            provider(8, "Netflix"),
            provider(9, "Amazon Prime Video"),
            provider(119, "Amazon Prime Video"),
          ],
        },
      }),
      FETCHED_AT,
    );

    expect(availability.countries.US).toEqual([
      { type: "stream", serviceId: 8, providerId: 8 },
      { type: "stream", serviceId: 119, providerId: 9 },
    ]);
  });

  it("keeps rent and buy when a country has no streaming offer", () => {
    const availability = normalizeProviders(
      raw({
        IE: {
          link: "https://example.test/ie",
          rent: [provider(10, "Amazon Video")],
          buy: [provider(10, "Amazon Video")],
        },
      }),
      FETCHED_AT,
    );

    expect(availability.countries.IE?.map((offer) => offer.type)).toEqual([
      "rent",
      "buy",
    ]);
  });

  it("omits countries with no offers and an empty result set", () => {
    const availability = normalizeProviders(
      raw({
        US: { link: "https://example.test/us" },
      }),
      FETCHED_AT,
    );
    const empty = normalizeProviders(raw({}), FETCHED_AT);

    expect(availability.countries).toEqual({});
    expect(empty.countries).toEqual({});
  });

  it("stays under 15 KB for a large provider response", () => {
    const results: WatchProviders["results"] = {};
    for (let index = 0; index < 80; index += 1) {
      const code =
        String.fromCharCode(65 + Math.floor(index / 26)) +
        String.fromCharCode(65 + (index % 26));
      results[code] = {
        link: `https://www.themoviedb.org/movie/550/watch?locale=${code}`,
        flatrate: [
          provider(8, "Netflix"),
          provider(337, "Disney Plus"),
          {
            ...provider(1899, "HBO Max"),
            logoPath: "/logo-that-the-browser-does-not-need-on-every-offer.png",
          },
        ],
      };
    }
    const providers = raw(results);

    expect(JSON.stringify(providers).length).toBeGreaterThan(15 * 1024);
    expect(
      JSON.stringify(normalizeProviders(providers, FETCHED_AT)).length,
    ).toBeLessThan(15 * 1024);
  });
});
