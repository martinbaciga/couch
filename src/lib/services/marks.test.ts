import { describe, expect, it } from "vitest";
import { listServiceMarks } from "@/lib/services/marks";
import type { WatchProvider, WatchProviders } from "@/lib/tmdb/types";

function provider(
  providerId: number,
  providerName: string,
  displayPriority: number,
  logoPath: string | null = null,
): WatchProvider {
  return { providerId, providerName, displayPriority, logoPath };
}

function providers(results: WatchProviders["results"]): WatchProviders {
  return { id: 1, results, fetchedAt: "2026-11-18T00:00:00.000Z" };
}

describe("listServiceMarks", () => {
  it("keeps the parent name and logo when a plan variant is also present", () => {
    const marks = listServiceMarks(
      providers({
        US: {
          link: "https://example.test",
          flatrate: [
            provider(1796, "Netflix Standard with Ads", 2, "/ads.png"),
          ],
        },
        DE: {
          link: "https://example.test",
          flatrate: [provider(8, "Netflix", 1, "/netflix.png")],
        },
      }),
    );

    expect(marks).toEqual([
      { id: 8, name: "Netflix", logoPath: "/netflix.png" },
    ]);
  });

  it("keeps an unknown service under its own name", () => {
    const marks = listServiceMarks(
      providers({
        FR: {
          link: "https://example.test",
          ads: [provider(191, "Pluto TV", 4, "/pluto.png")],
        },
      }),
    );

    expect(marks).toEqual([
      { id: 191, name: "Pluto TV", logoPath: "/pluto.png" },
    ]);
  });
});
