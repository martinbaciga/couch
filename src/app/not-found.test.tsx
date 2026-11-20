// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/en.json";
import NotFound, { generateMetadata } from "./not-found";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => {
    const value = key.split(".").reduce<unknown>((node, part) => {
      if (typeof node !== "object" || node === null) return undefined;
      return (node as Record<string, unknown>)[part];
    }, messages);
    if (typeof value !== "string") throw new Error(key);
    return value;
  },
}));

describe("page not found", () => {
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

  it("uses one heading and makes the start link the first control", async () => {
    const page = await NotFound();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(page);
    });

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(messages.notFound.title);
    expect(container.textContent).toContain(messages.notFound.eyebrow);
    expect(container.textContent).toContain(messages.notFound.body);
    expect(container.querySelector("img, svg")).toBeNull();

    const controls = container.querySelectorAll(
      "a[href], button, input, select, textarea",
    );
    expect(controls).toHaveLength(1);
    expect(controls[0]?.textContent).toBe(messages.notFound.action);
    expect(controls[0]?.getAttribute("href")).toBe("/");
  });

  it("asks crawlers not to index the page", async () => {
    await expect(generateMetadata()).resolves.toMatchObject({
      title: messages.notFound.title,
      robots: { index: false },
    });
  });
});
