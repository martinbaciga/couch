import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOGUE_CACHE_CONTROL } from "@/config/cache";
import { getRegions } from "@/lib/tmdb/client";

import { GET } from "./route";

vi.mock("@/lib/tmdb/client", () => ({
  getRegions: vi.fn(),
}));

const regions = vi.mocked(getRegions);

beforeEach(() => {
  regions.mockReset();
});

describe("GET /api/regions", () => {
  it("returns English names sorted, with a 24 hour cache", async () => {
    regions.mockResolvedValue([
      { code: "IE", englishName: "Ireland", nativeName: "Éire" },
      { code: "DE", englishName: "Germany", nativeName: "Deutschland" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe(CATALOGUE_CACHE_CONTROL);
    expect(body).toEqual({
      regions: [
        { code: "DE", name: "Germany" },
        { code: "IE", name: "Ireland" },
      ],
    });
  });
});
