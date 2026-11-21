// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { SETTINGS_KEY } from "@/lib/storage/settings";
import { resetRecentStore } from "@/lib/storage/recent";
import { WATCHLIST_IMPORT_PATH } from "@/lib/watchlist/paths";
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
