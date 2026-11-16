import { describe, expect, it } from "vitest";
import { parseTitleRef } from "./title-ref";

describe("parseTitleRef", () => {
  it("accepts a film or series id", () => {
    expect(parseTitleRef("movie", "550")).toEqual({ kind: "movie", id: 550 });
    expect(parseTitleRef("tv", "1399")).toEqual({ kind: "tv", id: 1399 });
  });

  it("rejects a bad kind or id", () => {
    expect(parseTitleRef("person", "550")).toBeNull();
    expect(parseTitleRef("movie", "0")).toBeNull();
    expect(parseTitleRef("movie", "01")).toBeNull();
    expect(parseTitleRef("movie", "550.5")).toBeNull();
    expect(parseTitleRef("movie", "9007199254740993")).toBeNull();
  });
});
