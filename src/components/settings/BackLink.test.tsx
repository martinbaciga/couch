// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import messages from "../../../messages/en.json";
import { BackLink } from "./BackLink";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

describe("BackLink", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("names a title, home, results, or a plain return", () => {
    render("/title/movie/550/fight-club");
    expect(link()?.textContent).toBe("Back to title");
    expect(link()?.getAttribute("href")).toBe("/title/movie/550/fight-club");

    render("/");
    expect(link()?.textContent).toBe("Back to home");
    expect(link()?.getAttribute("href")).toBe("/");

    render("/search?q=heat");
    expect(link()?.textContent).toBe("Back to results");
    expect(link()?.getAttribute("href")).toBe("/search?q=heat");

    render("/watchlist");
    expect(link()?.textContent).toBe("Back");
    expect(link()?.getAttribute("href")).toBe("/watchlist");
  });

  it("hides the chevron from the accessible name", () => {
    render("/title/movie/550");
    const icon = link()?.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(link()?.getAttribute("aria-label")).toBeNull();
  });

  function render(path: string) {
    act(() => root?.unmount());
    container?.remove();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <BackLink path={path} />
        </NextIntlClientProvider>,
      );
    });
  }

  function link() {
    return container?.querySelector("a");
  }
});
