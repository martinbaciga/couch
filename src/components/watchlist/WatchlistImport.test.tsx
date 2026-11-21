// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { MAX_WATCHLIST_ROWS } from "@/lib/csv/parseWatchlist";
import { WATCHLIST_KEY } from "@/lib/storage/watchlist";
import { ImportError } from "@/lib/match/runImport";
import { WatchlistImport } from "./WatchlistImport";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const runImport = vi.hoisted(() => vi.fn());

vi.mock("@/lib/match/runImport", async () => {
  const actual = await vi.importActual<typeof import("@/lib/match/runImport")>(
    "@/lib/match/runImport",
  );
  return { ...actual, runImport };
});

const HEADER = "Date,Name,Year,Letterboxd URI";

describe("WatchlistImport", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    runImport.mockReset();
    runImport.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
  });

  it("shows the import steps and a csv file input", () => {
    renderImport();

    expect(container?.querySelector("h1")?.textContent).toBe(
      "Import your Letterboxd watchlist",
    );
    expect(text()).toContain("Your watchlist is saved on this device only.");
    expect(text()).toContain("the export isn’t in the mobile app");
    expect(text()).toContain("Drop your watchlist CSV here");
    expect(text()).toContain("or choose it from your computer");
    const input = fileInput();
    expect(input?.getAttribute("accept")).toBe(".csv,text/csv");
    expect(input?.getAttribute("type")).toBe("file");
  });

  it("counts the films and starts matching without storing the file", async () => {
    renderImport();
    const csv = `${HEADER}\n2024-03-02,"Everything Everywhere All at Once",2022,https://boxd.it/abc\n`;

    await choose(csvFile(csv));

    expect(text()).toContain("1 film found");
    expect(text()).not.toContain("boxd.it");
    expect(text()).not.toContain(csv);
    expect(localStorage.getItem(WATCHLIST_KEY)).toBeNull();
    expect(runImport).toHaveBeenCalledTimes(1);
    expect(runImport.mock.calls[0]?.[0]).toEqual([
      {
        name: "Everything Everywhere All at Once",
        year: 2022,
        uri: "https://boxd.it/abc",
        date: "2024-03-02",
      },
    ]);
    const signal = runImport.mock.calls[0]?.[1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("drops a file on the box", async () => {
    renderImport();
    const zone = container?.querySelector("label");
    if (!(zone instanceof HTMLLabelElement)) throw new Error("missing drop");
    const file = csvFile(`${HEADER}\n2024-01-01,Heat,1995,https://boxd.it/a\n`);
    const transfer = new DataTransfer();
    transfer.items.add(file);

    await act(async () => {
      const event = new Event("drop", { bubbles: true });
      Object.defineProperty(event, "dataTransfer", { value: transfer });
      zone.dispatchEvent(event);
    });

    expect(text()).toContain("1 film found");
  });

  it("shows the wrong-file card and lets you choose another", async () => {
    renderImport();
    await choose(csvFile("Title,Year\nHeat,1995\n"));

    expect(text()).toContain("That doesn’t look like a Letterboxd watchlist");
    expect(runImport).not.toHaveBeenCalled();

    const again = button("Choose another file");
    await act(async () => {
      again?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(text()).toContain("Drop your watchlist CSV here");
  });

  it("shows the empty-file card", async () => {
    renderImport();
    await choose(csvFile(`${HEADER}\n`));

    expect(text()).toContain("This file has no films");
    expect(runImport).not.toHaveBeenCalled();
  });

  it("shows a clear message past the row limit", async () => {
    renderImport();
    const rows = [HEADER];
    for (let index = 0; index < MAX_WATCHLIST_ROWS + 1; index += 1) {
      rows.push(`2020-01-01,Film ${index},2020,https://boxd.it/${index}`);
    }
    await choose(csvFile(rows.join("\n")));

    expect(text()).toContain("This file is too large");
    expect(text()).toContain("2,000");
    expect(runImport).not.toHaveBeenCalled();
    expect(localStorage.getItem(WATCHLIST_KEY)).toBeNull();
  });

  it("shows the busy card when matching is rate limited, then retries", async () => {
    runImport.mockRejectedValueOnce(new ImportError("rate_limited"));
    renderImport();
    await choose(
      csvFile(`${HEADER}\n2024-01-01,Heat,1995,https://boxd.it/a\n`),
    );

    expect(text()).toContain("Lots of people are looking right now");
    expect(text()).toContain("1 film found");

    const retry = button("Try again");
    await act(async () => {
      retry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(runImport).toHaveBeenCalledTimes(2);
  });

  function renderImport() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <WatchlistImport />
        </NextIntlClientProvider>,
      );
    });
  }

  function text() {
    return container?.textContent ?? "";
  }

  function fileInput() {
    return container?.querySelector('input[type="file"]');
  }

  function button(label: string) {
    return [...(container?.querySelectorAll("button") ?? [])].find((item) =>
      item.textContent?.includes(label),
    );
  }

  async function choose(file: File) {
    const input = fileInput();
    if (!(input instanceof HTMLInputElement)) throw new Error("missing input");
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
});

function csvFile(contents: string) {
  return new File([contents], "watchlist.csv", { type: "text/csv" });
}
