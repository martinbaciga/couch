import { describe, expect, it } from "vitest";
import type { CountryRow } from "@/lib/availability/status";
import type { Offer, OfferType } from "@/lib/availability/types";
import {
  hiddenCount,
  previewRows,
  rowsForFilter,
  storeNames,
  streamLogoMarks,
} from "./country-view";

function offer(
  type: OfferType,
  serviceId: number,
  variant?: Offer["variant"],
): Offer {
  return { type, serviceId, providerId: serviceId, variant };
}

function row(country: string, offers: Offer[]): CountryRow {
  return {
    country,
    hasMyService: false,
    offersByType: {
      stream: offers.filter((item) => item.type === "stream"),
      ads: offers.filter((item) => item.type === "ads"),
      free: offers.filter((item) => item.type === "free"),
      rent: offers.filter((item) => item.type === "rent"),
      buy: offers.filter((item) => item.type === "buy"),
    },
  };
}

const rows = [
  row("DE", [offer("stream", 8), offer("rent", 10)]),
  row("JP", [offer("buy", 11)]),
  row("AU", [offer("free", 12)]),
  row("ES", [offer("ads", 13), offer("rent", 10)]),
];

describe("rowsForFilter", () => {
  it("keeps byCountry order and drops rows without that offer", () => {
    expect(rowsForFilter(rows, "stream").map((item) => item.country)).toEqual([
      "DE",
    ]);
    expect(rowsForFilter(rows, "free").map((item) => item.country)).toEqual([
      "AU",
      "ES",
    ]);
    expect(rowsForFilter(rows, "rent-buy").map((item) => item.country)).toEqual(
      ["DE", "JP", "ES"],
    );
  });
});

describe("previewRows", () => {
  it("shows six until the list is opened", () => {
    const countries = ["DE", "FR", "JP", "BR", "CA", "ES", "AU"];
    expect(previewRows(countries, false)).toEqual(countries.slice(0, 6));
    expect(hiddenCount(countries.length, false)).toBe(1);
    expect(previewRows(countries, true)).toEqual(countries);
    expect(hiddenCount(countries.length, true)).toBe(0);
    expect(hiddenCount(4, false)).toBe(0);
  });
});

describe("storeNames", () => {
  it("keeps every name on desktop and the first two on mobile", () => {
    const names = ["Store A", "Store B", "Store C"];
    expect(storeNames(names, false)).toEqual({ shown: names, extra: 0 });
    expect(storeNames(names, true)).toEqual({
      shown: ["Store A", "Store B"],
      extra: 1,
    });
    expect(storeNames(["Store A"], true)).toEqual({
      shown: ["Store A"],
      extra: 0,
    });
  });
});

describe("streamLogoMarks", () => {
  it("lists your services first and dashes a plan-only logo", () => {
    const marks = streamLogoMarks(
      [
        offer("stream", 9),
        offer("stream", 8, "ads"),
        offer("stream", 8, "tier"),
        offer("stream", 4),
        offer("stream", 3, "channel"),
      ],
      new Set([8, 3]),
    );

    expect(marks).toEqual([
      { id: 8, marker: "plan" },
      { id: 3, marker: "mine" },
      { id: 9, marker: "none" },
      { id: 4, marker: "none" },
    ]);
  });

  it("uses a solid mark when one of your offers is not a plan", () => {
    expect(
      streamLogoMarks(
        [offer("stream", 8), offer("stream", 8, "ads")],
        new Set([8]),
      ),
    ).toEqual([{ id: 8, marker: "mine" }]);
  });
});
