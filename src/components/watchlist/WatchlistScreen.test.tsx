// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { resetSettingsStore } from "@/lib/storage/settings";
import { WATCHLIST_KEY } from "@/lib/storage/watchlist";
import { WatchlistScreen } from "./WatchlistScreen";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const search = vi.hoisted(() => ({ current: "" }));

vi.mock("@/lib/match/runImport", () => ({
  runImport: vi.fn(),
  ImportError: class ImportError extends Error {},
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/watchlist",
  useSearchParams: () => new URLSearchParams(search.current),
}));

describe("WatchlistScreen", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    resetSettingsStore();
    search.current = "";
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
    resetSettingsStore();
  });

  it("shows the import screen when nothing is saved", () => {
    renderScreen();
    expect(heading()).toBe("Import your Letterboxd watchlist");
  });

  it("shows results when a list is saved", () => {
    saveList();
    renderScreen();
    expect(heading()).toBe("Your watchlist");
  });

  it("opens the import screen again from the import link", () => {
    saveList();
    search.current = "import=1";
    renderScreen();
    expect(heading()).toBe("Import your Letterboxd watchlist");
  });

  function renderScreen() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <WatchlistScreen />
        </NextIntlClientProvider>,
      );
    });
  }

  function heading() {
    return container?.querySelector("h1")?.textContent;
  }

  function saveList() {
    localStorage.setItem(
      WATCHLIST_KEY,
      JSON.stringify({
        importedAt: "2026-11-01T00:00:00.000Z",
        entries: [],
        summary: { computedAt: null, counts: null },
      }),
    );
  }
});
