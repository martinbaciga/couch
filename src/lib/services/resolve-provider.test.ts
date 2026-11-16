import { describe, expect, it } from "vitest";

import { listCountryServices } from "@/lib/services/catalogue";
import { resolveProvider } from "@/lib/services/resolve-provider";
import type { CatalogueProvider } from "@/lib/tmdb/types";

const cases: Array<{
  id: number;
  name: string;
  expected: ReturnType<typeof resolveProvider>;
}> = [
  { id: 8, name: "Netflix", expected: { serviceId: 8 } },
  {
    id: 1796,
    name: "Netflix Standard with Ads",
    expected: { serviceId: 8, variant: "ads", variantLabel: "with ads" },
  },
  {
    id: 2100,
    name: "Amazon Prime Video with Ads",
    expected: { serviceId: 119, variant: "ads", variantLabel: "with ads" },
  },
  {
    id: 2303,
    name: "Paramount Plus Premium",
    expected: { serviceId: 531, variant: "tier", variantLabel: "Premium" },
  },
  {
    id: 201,
    name: "MUBI Amazon Channel",
    expected: { serviceId: 201, via: "Amazon" },
  },
  {
    id: 633,
    name: "Paramount+ Roku Premium Channel",
    expected: { serviceId: 633, via: "Roku" },
  },
  {
    id: 2041,
    name: "BFI Player Apple TV Channel",
    expected: { serviceId: 2041, via: "Apple TV" },
  },
  { id: 9, name: "Not the real name", expected: { serviceId: 119 } },
  { id: 119, name: "Amazon Prime Video", expected: { serviceId: 119 } },
  { id: 122, name: "Disney+", expected: { serviceId: 337 } },
  { id: 424242, name: "Hometown Pictures", expected: { serviceId: 424242 } },
];

describe("resolveProvider", () => {
  it.each(cases)("$name ($id)", ({ id, name, expected }) => {
    expect(resolveProvider(id, name)).toEqual(expected);
  });
});

describe("listCountryServices", () => {
  it("keeps the top 6 base services and puts channels in the full catalogue", () => {
    const providers: CatalogueProvider[] = [
      provider(201, "MUBI Amazon Channel", 0),
      provider(8, "Netflix", 1, "/netflix.png"),
      provider(1796, "Netflix Standard with Ads", 30, "/netflix-ads.png"),
      provider(119, "Amazon Prime Video", 2),
      provider(9, "Amazon Prime Video", 4),
      provider(337, "Disney Plus", 3),
      provider(1899, "HBO Max", 5),
      provider(531, "Paramount Plus", 6),
      provider(350, "Apple TV", 7),
      provider(15, "Hulu", 8),
      provider(35, "Rakuten TV", 9),
    ];

    const { services, catalogue } = listCountryServices(providers);

    expect(services.map((service) => service.id)).toEqual([
      8, 119, 337, 1899, 531, 350,
    ]);
    expect(services.every((service) => !service.via)).toBe(true);
    expect(catalogue.find((service) => service.id === 201)).toMatchObject({
      via: "Amazon",
    });
    expect(catalogue.filter((service) => service.id === 8)).toHaveLength(1);
    expect(catalogue.find((service) => service.id === 8)?.logoPath).toBe(
      "/netflix.png",
    );
  });
});

function provider(
  providerId: number,
  providerName: string,
  displayPriority: number,
  logoPath: string | null = null,
): CatalogueProvider {
  return { providerId, providerName, displayPriority, logoPath };
}
