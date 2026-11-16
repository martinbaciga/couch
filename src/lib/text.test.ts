import { describe, expect, it } from "vitest";
import { containsFolded } from "./text";

describe("containsFolded", () => {
  it("matches case and accents", () => {
    expect(containsFolded("Crave", "cra")).toBe(true);
    expect(containsFolded("Télérama", "tele")).toBe(true);
    expect(containsFolded("Netflix", "hulu")).toBe(false);
  });

  it("matches everything when the query is blank", () => {
    expect(containsFolded("Netflix", "  ")).toBe(true);
  });
});
