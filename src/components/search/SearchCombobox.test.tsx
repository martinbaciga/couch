// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { resetRecentStore, type RecentTitle } from "@/lib/storage/recent";
import { SearchCombobox } from "./SearchCombobox";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const parasite: RecentTitle = {
  kind: "movie",
  id: 496243,
  title: "Parasite",
  year: 2019,
  posterPath: null,
};

const bear: RecentTitle = {
  kind: "tv",
  id: 100088,
  title: "The Bear",
  year: 2022,
  posterPath: null,
};

describe("SearchCombobox", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetRecentStore();
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              page: 1,
              totalPages: 0,
              totalResults: 0,
              results: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
    resetRecentStore();
    vi.unstubAllGlobals();
  });

  it("shows Esc until the field has text, then Enter", () => {
    renderCombobox();
    const input = field();
    expect(hintText()).toBe("Esc");
    expect(input.getAttribute("enterkeyhint")).toBe("search");

    setField(input, "fight");
    expect(hintText()).toBe("Enter");

    setField(input, "   ");
    expect(hintText()).toBe("Esc");
  });

  it("keeps Chrome's saved entries off this field", () => {
    renderCombobox();
    const input = field();
    expect(input.name).toMatch(/^couch-title-[a-z0-9]+$/);
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(container?.querySelector("form")?.getAttribute("autocomplete")).toBe(
      "off",
    );
    const hidden = container?.querySelector('input[type="hidden"]');
    expect(hidden).toBeInstanceOf(HTMLInputElement);
    if (!(hidden instanceof HTMLInputElement)) return;
    expect(hidden.name).toBe("q");
    expect(hidden.value).toBe("");

    setField(input, "fight");
    expect(field().name).toBe(input.name);
    expect(field().getAttribute("autocomplete")).toBe("off");
    expect(hidden.value).toBe("fight");
  });

  it("shows Enter on the keyed row only, and drops it when the pointer moves", () => {
    seed([parasite, bear]);
    renderCombobox();
    const input = field();
    key(input, "ArrowDown");

    expect(hintText()).toBeNull();
    expect(rowHint()).toBe("Enter");
    expect(
      container?.querySelector("[aria-selected='true']")?.textContent,
    ).toContain("Parasite");

    act(() => {
      window.dispatchEvent(new Event("pointermove"));
    });

    expect(hintText()).toBe("Esc");
    expect(rowHint()).toBeNull();
  });

  it("removes one recently viewed title and announces it", () => {
    seed([parasite, bear]);
    renderCombobox();
    const button = removeButton("Parasite");
    expect(button?.closest("a")).toBeNull();
    expect(button?.parentElement?.querySelector("a")).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(optionText()).not.toContain("Parasite");
    expect(optionText()).toContain("The Bear");
    expect(liveText()).toBe("Removed Parasite from recently viewed");
    expect(field().value).toBe("");
  });

  it("moves the highlight when Delete removes a keyed title", () => {
    seed([parasite, bear]);
    renderCombobox();
    const input = field();
    key(input, "ArrowDown");
    key(input, "Delete");

    expect(optionText()).not.toContain("Parasite");
    expect(
      container?.querySelector("[aria-selected='true']")?.textContent,
    ).toContain("The Bear");
    expect(liveText()).toBe("Removed Parasite from recently viewed");
  });

  it("returns focus to the field when the last title is removed", () => {
    seed([parasite]);
    renderCombobox();
    act(() => {
      removeButton("Parasite")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(optionText()).toBe("");
    expect(container?.textContent).toContain(
      "Start typing to see matches. Pick one to open its page.",
    );
    expect(document.activeElement).toBe(field());
  });

  it("clears recently viewed and returns to the empty hint", () => {
    seed([parasite]);
    renderCombobox();
    const clear = [...(container?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Clear",
    );

    act(() => {
      clear?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container?.textContent).toContain(
      "Start typing to see matches. Pick one to open its page.",
    );
    expect(container?.textContent).not.toContain("Parasite");
    expect(document.activeElement).toBe(field());
  });

  function renderCombobox() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SearchCombobox variant="modal" />
        </NextIntlClientProvider>,
      );
    });
  }

  function field() {
    const input = container?.querySelector("[role='combobox']");
    if (!(input instanceof HTMLInputElement)) throw new Error("missing field");
    return input;
  }

  function hintText() {
    const input = field();
    return (
      [...(input.parentElement?.children ?? [])].find(
        (node) =>
          node.getAttribute("aria-hidden") === "true" &&
          (node.textContent === "Esc" || node.textContent === "Enter"),
      )?.textContent ?? null
    );
  }

  function optionText() {
    return [...(container?.querySelectorAll("[role='option']") ?? [])]
      .map((node) => node.textContent)
      .join(" ");
  }

  function rowHint() {
    const selected = container?.querySelector("[aria-selected='true']");
    return (
      [...(selected?.querySelectorAll("[aria-hidden='true']") ?? [])].find(
        (node) => node.textContent === "Enter",
      )?.textContent ?? null
    );
  }

  function liveText() {
    return (
      [...(container?.querySelectorAll("[aria-live='polite']") ?? [])].find(
        (node) => node.textContent?.startsWith("Removed"),
      )?.textContent ?? ""
    );
  }

  function removeButton(title: string) {
    return container?.querySelector(
      `button[aria-label="Remove ${title} from recently viewed"]`,
    );
  }

  function seed(titles: RecentTitle[]) {
    localStorage.setItem("couch:recent:v1", JSON.stringify({ titles }));
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

  function key(input: HTMLInputElement, name: string) {
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true }),
      );
    });
  }
});
