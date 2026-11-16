import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOGUE_CACHE_CONTROL } from "@/config/cache";
import { UpstreamError } from "@/lib/tmdb/errors";
import { getProviderCatalogue, getRegions } from "@/lib/tmdb/client";

import { GET } from "./route";

vi.mock("@/lib/tmdb/client", () => ({
  getRegions: vi.fn(),
  getProviderCatalogue: vi.fn(),
}));

const regions = vi.mocked(getRegions);
const catalogue = vi.mocked(getProviderCatalogue);

beforeEach(() => {
  regions.mockReset();
  catalogue.mockReset();
  regions.mockResolvedValue([
    { code: "IE", englishName: "Ireland", nativeName: "Ireland" },
  ]);
  catalogue.mockImplementation(async (kind) => [
    {
      providerId: kind === "movie" ? 8 : 1899,
      providerName: kind === "movie" ? "Netflix" : "HBO Max",
      logoPath: null,
      displayPriority: kind === "movie" ? 1 : 2,
    },
  ]);
});

describe("GET /api/services", () => {
  it("returns the base list and the full catalogue for a known country", async () => {
    const response = await GET(request("ie"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(CATALOGUE_CACHE_CONTROL);
    expect(body.country).toBe("IE");
    expect(body.services.map((service: { id: number }) => service.id)).toEqual([
      8, 1899,
    ]);
    expect(catalogue).toHaveBeenCalledWith("movie", "IE");
    expect(catalogue).toHaveBeenCalledWith("tv", "IE");
  });

  it("returns 400 when the country is missing or unknown", async () => {
    const missing = await GET(request(null));
    const unknown = await GET(request("ZZ"));

    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({
      error: { code: "bad_request", message: "bad_request" },
    });
    expect(unknown.status).toBe(400);
    expect(catalogue).not.toHaveBeenCalled();
  });

  it("maps an upstream failure", async () => {
    regions.mockRejectedValue(new UpstreamError(503));

    const response = await GET(request("IE"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "upstream_unavailable",
        message: "upstream_unavailable",
      },
    });
  });
});

function request(country: string | null): Request {
  const url = new URL("http://localhost/api/services");
  if (country) url.searchParams.set("country", country);
  return new Request(url);
}
