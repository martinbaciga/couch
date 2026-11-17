import { describe, expect, it } from "vitest";
import { flagPath } from "./flag-path";

describe("flagPath", () => {
  it("points at the circular flag for a country code", () => {
    expect(flagPath("IE")).toBe("/flags/ie.svg");
    expect(flagPath(" gb ")).toBe("/flags/gb.svg");
  });

  it("is empty when the code is not a country code", () => {
    expect(flagPath("")).toBeNull();
    expect(flagPath("E")).toBeNull();
    expect(flagPath("Ireland")).toBeNull();
  });
});
