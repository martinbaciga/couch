// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { SETTINGS_KEY, resetSettingsStore } from "@/lib/storage/settings";
import { WATCHLIST_IMPORT_PATH } from "@/lib/watchlist/paths";
import { Header, type RegionNames } from "./Header";
import { SearchContext, createSearchContext } from "./search-context";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const pathname = vi.hoisted(() => ({ current: "/settings" }));
const search = vi.hoisted(() => ({ current: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(search.current),
}));

const ireland: RegionNames = { IE: "Ireland" };
const renamed: RegionNames = { IE: "Éire" };

describe("Header settings item", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    pathname.current = "/settings";
    search.current = "";
    localStorage.clear();
    resetSettingsStore();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
    resetSettingsStore();
  });

  it("names a saved country and its services", () => {
    save("IE", [8, 337]);
    renderHeader(ireland);

    expect(settingsLink()?.textContent).toContain("Ireland · 2 services");
    expect(settingsLink()?.textContent).toContain("IE · 2");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Ireland, 2 services. Open settings.",
    );
  });

  it("asks for setup when no country is saved", () => {
    renderHeader(ireland);

    expect(settingsLink()?.textContent).toContain("Set country & services");
    expect(settingsLink()?.textContent).toContain("Set up");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Set country and services. Open settings.",
    );
  });

  it("shows zero services when a country is saved without any", () => {
    save("IE", []);
    renderHeader(ireland);

    expect(settingsLink()?.textContent).toContain("Ireland · 0 services");
    expect(settingsLink()?.textContent).toContain("IE · 0");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Ireland, 0 services. Open settings.",
    );
  });

  it("uses the singular when one service is saved", () => {
    save("IE", [8]);
    renderHeader(ireland);

    expect(settingsLink()?.textContent).toContain("Ireland · 1 service");
    expect(settingsLink()?.textContent).toContain("IE · 1");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Ireland, 1 service. Open settings.",
    );
  });

  it("takes the country name from the regions list", () => {
    save("IE", [8, 337]);
    renderHeader(renamed);

    expect(settingsLink()?.textContent).toContain("Éire · 2 services");
    expect(settingsLink()?.textContent).not.toContain("Ireland");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Éire, 2 services. Open settings.",
    );
  });

  it("uses the ISO code when the regions list has no name", () => {
    save("IE", [8, 337]);
    renderHeader({});

    expect(settingsLink()?.textContent).toContain("IE · 2 services");
    expect(settingsLink()?.textContent).not.toContain("Ireland");
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "IE, 2 services. Open settings.",
    );
  });

  it("updates the label when settings change in another tab", () => {
    renderHeader(ireland);
    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Set country and services. Open settings.",
    );

    act(() => {
      save("IE", [8]);
      window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_KEY }));
    });

    expect(settingsLink()?.getAttribute("aria-label")).toBe(
      "Ireland, 1 service. Open settings.",
    );
  });

  it("changes the settings href with the route", () => {
    pathname.current = "/";
    renderHeader(ireland);
    expect(settingsLink()?.getAttribute("href")).toBe("/settings?return=%2F");
    expect(settingsLink()?.getAttribute("aria-current")).toBeNull();

    act(() => root?.unmount());
    container?.remove();
    pathname.current = "/search";
    search.current = "q=heat";
    renderHeader(ireland);
    expect(settingsLink()?.getAttribute("href")).toBe(
      "/settings?return=%2Fsearch%3Fq%3Dheat",
    );

    act(() => root?.unmount());
    container?.remove();
    pathname.current = "/title/movie/550/fight-club";
    search.current = "view=country";
    renderHeader(ireland);
    expect(settingsLink()?.getAttribute("href")).toBe(
      "/settings?return=%2Ftitle%2Fmovie%2F550%2Ffight-club%3Fview%3Dcountry",
    );
  });

  it("has no return on the settings page", () => {
    pathname.current = "/settings";
    search.current = "return=%2Fsearch%3Fq%3Dheat";
    renderHeader(ireland);

    expect(settingsLink()?.getAttribute("href")).toBe("/settings");
    expect(settingsLink()?.getAttribute("aria-current")).toBe("page");
    expect(
      container?.querySelector(`a[href="${WATCHLIST_IMPORT_PATH}"]`),
    ).not.toBeNull();
  });

  it("shows text for every landing item", () => {
    pathname.current = "/";
    renderHeader(ireland);

    const imports = [
      ...(container?.querySelectorAll(`a[href="${WATCHLIST_IMPORT_PATH}"]`) ??
        []),
    ];
    expect(imports).toHaveLength(1);
    expect(imports[0]?.textContent).toContain("Import watchlist");
    expect(imports[0]?.getAttribute("aria-label")).toBeNull();
    expect(container?.querySelector("button")).toBeNull();
  });

  function renderHeader(regions: RegionNames) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SearchContext.Provider
            value={createSearchContext(
              false,
              () => undefined,
              () => undefined,
            )}
          >
            <Header regions={regions} />
          </SearchContext.Provider>
        </NextIntlClientProvider>,
      );
    });
  }

  function settingsLink() {
    return container?.querySelector('a[href^="/settings"]');
  }

  function save(country: string, serviceIds: number[]) {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        country,
        serviceIds,
        updatedAt: "2026-11-01T00:00:00.000Z",
      }),
    );
  }
});
