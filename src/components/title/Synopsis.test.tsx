// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { Synopsis } from "./Synopsis";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const shortText = "A short synopsis.";
const longText = `${"A long synopsis sentence. ".repeat(12)}The ending stays in the document.`;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Synopsis", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let scrollHeight: PropertyDescriptor | undefined;
  let clientHeight: PropertyDescriptor | undefined;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    scrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );
    clientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (this.tagName !== "P") return 0;
        return (this.textContent ?? "").includes("ending stays") ? 200 : 40;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.tagName !== "P") return 0;
        return (this.textContent ?? "").includes("ending stays") ? 80 : 40;
      },
    });
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    if (scrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        scrollHeight,
      );
    }
    if (clientHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "clientHeight",
        clientHeight,
      );
    }
    vi.unstubAllGlobals();
  });

  async function render(text: string) {
    await act(async () => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <Synopsis text={text} />
        </NextIntlClientProvider>,
      );
      await document.fonts?.ready;
    });
  }

  it("hides the control when the text fits in four lines", async () => {
    await render(shortText);
    expect(container?.querySelector("button")).toBeNull();
    expect(container?.textContent).toContain(shortText);
  });

  it("shows Read more for a clamped synopsis and toggles the label", async () => {
    await render(longText);
    const button = container?.querySelector("button");
    const synopsis = container?.querySelector("p");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.textContent).toBe("Read more");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.getAttribute("aria-controls")).toBe(synopsis?.id);
    expect(synopsis?.textContent).toBe(longText);
    expect(synopsis?.className).toContain("line-clamp-4");

    button?.focus();
    await act(async () => {
      button?.click();
    });

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(button?.textContent).toBe("Show less");
    expect(synopsis?.className).not.toContain("line-clamp-4");
    expect(document.activeElement).toBe(button);

    await act(async () => {
      button?.click();
    });

    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.textContent).toBe("Read more");
  });

  it("resets when the synopsis changes", async () => {
    await render(longText);
    const button = container?.querySelector("button");
    await act(async () => {
      button?.click();
    });
    expect(button?.textContent).toBe("Show less");

    await render(shortText);
    expect(container?.querySelector("button")).toBeNull();
    expect(container?.querySelector("p")?.className).toContain("line-clamp-4");

    await render(longText);
    expect(container?.querySelector("button")?.textContent).toBe("Read more");
    expect(container?.querySelector("button")?.getAttribute("aria-expanded")).toBe(
      "false",
    );
  });
});
