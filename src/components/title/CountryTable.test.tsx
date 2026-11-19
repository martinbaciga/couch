// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CountryRow } from "@/lib/availability/status";
import type { Offer, OfferType } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import messages from "../../../messages/en.json";
import { CountryTable } from "./CountryTable";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const marks = new Map<number, ServiceMark>([
  [8, { id: 8, name: "Netflix", logoPath: null }],
  [9, { id: 9, name: "Prime", logoPath: null }],
  [10, { id: 10, name: "Store A", logoPath: null }],
  [11, { id: 11, name: "Store B", logoPath: null }],
  [12, { id: 12, name: "Store C", logoPath: null }],
]);

function offer(type: OfferType, serviceId: number): Offer {
  return { type, serviceId, providerId: serviceId };
}

function row(country: string, offers: Offer[]): CountryRow {
  return {
    country,
    hasMyService: offers.some(
      (item) => item.type === "stream" && item.serviceId === 8,
    ),
    offersByType: {
      stream: offers.filter((item) => item.type === "stream"),
      ads: offers.filter((item) => item.type === "ads"),
      free: offers.filter((item) => item.type === "free"),
      rent: offers.filter((item) => item.type === "rent"),
      buy: offers.filter((item) => item.type === "buy"),
    },
  };
}

const streamCountries = ["DE", "FR", "BR", "CA", "AU", "SE", "NO"];

const rows: CountryRow[] = [
  row("DE", [
    offer("stream", 8),
    offer("rent", 10),
    offer("rent", 11),
    offer("rent", 12),
  ]),
  ...streamCountries
    .slice(1, -1)
    .map((country) => row(country, [offer("stream", 9)])),
  row("NO", [offer("stream", 9)]),
  row("JP", [offer("buy", 10)]),
  row("ES", [offer("ads", 9)]),
];

describe("CountryTable", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
  });

  async function render(filtered: boolean) {
    await act(async () => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <CountryTable
            rows={rows}
            marks={marks}
            settings={{ country: "IE", serviceIds: [8] }}
            filtered={filtered}
          />
        </NextIntlClientProvider>,
      );
    });
  }

  function button(label: string): HTMLButtonElement | undefined {
    return [...(container?.querySelectorAll("button") ?? [])].find(
      (item) => item.textContent === label,
    );
  }

  it("filters by offer type, then reveals the rest of that list", async () => {
    await render(true);

    const headers = [
      ...(container?.querySelectorAll("th[scope=col]") ?? []),
    ].map((header) => header.textContent);
    expect(headers).toEqual(["Country", "Stream", "Free / ads", "Rent", "Buy"]);
    const countries = [
      ...(container?.querySelectorAll("th[scope=row]") ?? []),
    ].map((header) => header.textContent);
    expect(countries).toHaveLength(6);
    expect(countries[0]).toContain("Germany");
    expect(countries[1]).toContain("France");
    expect(button("Stream")?.getAttribute("aria-pressed")).toBe("true");
    expect(container?.textContent).toContain("Germany");
    expect(container?.textContent).not.toContain("Japan");
    expect(container?.textContent).not.toContain("Spain");
    expect(container?.textContent).not.toContain("Norway");
    expect(button("Show 1 more country")).toBeTruthy();
    expect(container?.textContent).toContain(
      "Countries with your services come first. Dashed = only on a specific plan or tier.",
    );

    const list = container?.querySelector("ul.flex-col");
    expect(list?.textContent).toContain("Free or ads");
    expect(list?.textContent).toContain("Store A · Store B · +1 more");
    expect(container?.querySelector("table")?.textContent).toContain(
      "Store A · Store B · Store C",
    );
    expect(container?.querySelector("table")?.textContent).not.toContain(
      "+1 more",
    );

    await act(async () => {
      button("Show 1 more country")?.click();
    });
    expect(container?.textContent).toContain("Norway");
    expect(button("Show 1 more country")).toBeUndefined();

    await act(async () => {
      button("Rent / buy")?.click();
    });
    expect(button("Rent / buy")?.getAttribute("aria-pressed")).toBe("true");
    expect(container?.textContent).toContain("Japan");
    expect(container?.textContent).toContain("Germany");
    expect(container?.textContent).not.toContain("France");

    await act(async () => {
      button("Free / ads")?.click();
    });
    expect(container?.textContent).toContain("Spain");
    expect(container?.textContent).not.toContain("Germany");

    await act(async () => {
      button("Stream")?.click();
    });
    expect(button("Stream")?.getAttribute("aria-pressed")).toBe("true");
    expect(container?.textContent).toContain("Germany");
  });

  it("lists every country without chips when settings are missing", async () => {
    await render(false);

    expect(container?.querySelector("[aria-pressed]")).toBeNull();
    expect(container?.textContent).not.toContain("Japan");
    await act(async () => {
      button("Show 3 more countries")?.click();
    });
    expect(container?.textContent).toContain("Japan");
    expect(container?.textContent).toContain("Spain");
    expect(container?.textContent).toContain(
      "Set your services to see these grouped by what you have.",
    );
    expect(container?.textContent).not.toContain(
      "Countries with your services come first.",
    );
  });
});
