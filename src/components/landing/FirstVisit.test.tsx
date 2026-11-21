// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { RECENT_KEY, resetRecentStore } from "@/lib/storage/recent";
import { SETTINGS_KEY } from "@/lib/storage/settings";
import { WATCHLIST_KEY } from "@/lib/storage/watchlist";
import { WATCHLIST_IMPORT_PATH, WATCHLIST_PATH } from "@/lib/watchlist/paths";
import { FirstVisit } from "./FirstVisit";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("FirstVisit", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    resetRecentStore();
    push.mockClear();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
    resetRecentStore();
  });

  it("offers the two titles, the setup link, and the import card", () => {
    renderLanding();

    expect(container?.querySelector("h1")?.textContent).toBe(
      "See where films are streaming",
    );
    expect(text()).toContain(
      "Search any film or series, and see in which countries they are available",
    );
    expect(hrefs()).toEqual(
      expect.arrayContaining([
        "/title/movie/550/fight-club",
        "/title/movie/603/the-matrix",
        "/settings?return=%2F",
        WATCHLIST_IMPORT_PATH,
        "https://letterboxd.com",
      ]),
    );

    const exportLink = link("How to export from Letterboxd");
    expect(exportLink?.getAttribute("target")).toBe("_blank");
    expect(exportLink?.getAttribute("rel")).toContain("noopener");
    expect(container?.querySelector("img")).toBeNull();
  });

  it("leaves the setup link out of the server html", () => {
    const html = renderToString(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FirstVisit />
      </NextIntlClientProvider>,
    );

    expect(html).not.toContain("for tailored results");
    expect(html).not.toContain("Your watchlist");
    expect(html).toContain("Choose CSV file");
  });

  it("hides the setup link once a country is saved", () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        country: "IE",
        serviceIds: [8],
        updatedAt: "2026-11-01T00:00:00.000Z",
      }),
    );
    renderLanding();

    expect(link("Set country & services for tailored results")).toBeUndefined();
    expect(link("Choose CSV file")?.getAttribute("href")).toBe(
      WATCHLIST_IMPORT_PATH,
    );
  });

  it("replaces the import card when a watchlist is saved", () => {
    saveSettings("2026-11-01T00:00:00.000Z");
    saveWatchlist({
      computedAt: "2026-11-18T12:00:00.000Z",
      settingsAt: "2026-11-01T00:00:00.000Z",
      checkedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      counts: {
        "on-my-services-here": 1,
        "streaming-here": 0,
        "free-or-ads-here": 5,
        "other-services-here": 4,
        "rent-or-buy-here-only": 31,
        "other-countries-only": 27,
        "no-data": 14,
      },
    });
    renderLanding();

    expect(container?.querySelector("h1")?.textContent).toBe(
      "See where films are streaming",
    );
    expect(text()).toContain("Your watchlist · 1 film");
    expect(text()).toContain("1 is streaming on your services");
    expect(text()).toContain("On your services here");
    expect(text()).toContain("On other services here");
    expect(text()).toContain("No data found");
    expect(text()).toContain("Films and series you open will appear here.");
    expect(text()).not.toContain("Recalculating...");
    expect(text()).toMatch(/Imported .+ · Checked .+ago/);
    expect(link("Choose CSV file")).toBeUndefined();
    expect(link("Explore")?.getAttribute("href")).toBe(WATCHLIST_PATH);
    expect(link("Re-import")?.getAttribute("href")).toBe(WATCHLIST_IMPORT_PATH);
    expect(container?.querySelector(".landing-return")).not.toBeNull();
    expect(
      container?.querySelector("[role='combobox']")?.getAttribute("name"),
    ).toMatch(/^couch-title-/);
  });

  it("marks the counts stale when settings changed after the summary", () => {
    saveSettings("2026-11-20T00:00:00.000Z");
    saveWatchlist({
      computedAt: "2026-11-18T12:00:00.000Z",
      settingsAt: "2026-11-01T00:00:00.000Z",
      counts: {
        "on-my-services-here": 0,
        "streaming-here": 0,
        "free-or-ads-here": 0,
        "other-services-here": 0,
        "rent-or-buy-here-only": 0,
        "other-countries-only": 0,
        "no-data": 1,
      },
    });
    renderLanding();

    expect(text()).toContain("0 are streaming on your services");
    expect(text()).toContain("Recalculating...");
    expect(text()).toContain("No data found");
  });

  it("shows recalculating until the summary has counts", () => {
    saveWatchlist({ computedAt: null, counts: null });
    renderLanding();

    expect(text()).toContain("Recalculating...");
    expect(text()).not.toContain("streaming on your services");
    expect(text()).not.toContain("On your services here");
    expect(text()).toContain("Imported");
    expect(text()).not.toContain("Checked");
  });

  it("lists the last five opened titles and keeps the import card without a watchlist", () => {
    const titles = [1, 2, 3, 4, 5, 6].map((id) => ({
      kind: "movie",
      id,
      title: `Seen ${id}`,
      year: 2000,
      posterPath: null,
    }));
    localStorage.setItem(RECENT_KEY, JSON.stringify({ titles }));
    renderLanding();

    expect(link("Choose CSV file")).toBeDefined();
    expect(container?.querySelector(".landing-return")).toBeNull();
    expect(text()).not.toContain("Films and series you open will appear here.");
    for (const id of [1, 2, 3, 4, 5]) {
      expect(text()).toContain(`Seen ${id}`);
    }
    expect(text()).not.toContain("Seen 6");
  });

  it("submits the typed title and ignores an empty search", () => {
    renderLanding();
    const form = container?.querySelector("form");
    const input = container?.querySelector("[role='combobox']");
    const hidden = container?.querySelector('input[type="hidden"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("missing field");
    if (!(hidden instanceof HTMLInputElement)) throw new Error("missing q");

    expect(input.name).toMatch(/^couch-title-[a-z0-9]+$/);
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(form?.getAttribute("action")).toBe("/search");
    expect(hidden.name).toBe("q");

    act(() => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(push).not.toHaveBeenCalled();

    setField(input, "  fight   club ");
    expect(hidden.value).toBe("  fight   club ");
    act(() => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(push).toHaveBeenCalledWith("/search?q=fight%20club");
  });

  function saveSettings(updatedAt: string) {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ country: "IE", serviceIds: [8], updatedAt }),
    );
  }

  function saveWatchlist(summary: unknown) {
    localStorage.setItem(
      WATCHLIST_KEY,
      JSON.stringify({
        importedAt: "2026-11-02T12:00:00.000Z",
        entries: [
          {
            entry: { name: "Heat", year: 1995, uri: "", date: "2024-01-01" },
            match: {
              kind: "movie",
              tmdbId: 949,
              title: "Heat",
              year: 1995,
              posterPath: null,
            },
          },
        ],
        summary,
      }),
    );
  }

  function renderLanding() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <FirstVisit />
        </NextIntlClientProvider>,
      );
    });
  }

  function text() {
    return container?.textContent ?? "";
  }

  function hrefs() {
    return [...(container?.querySelectorAll("a") ?? [])].map((anchor) =>
      anchor.getAttribute("href"),
    );
  }

  function link(label: string) {
    return [...(container?.querySelectorAll("a") ?? [])].find(
      (anchor) => anchor.textContent === label,
    );
  }

  function setField(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    act(() => {
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
});
