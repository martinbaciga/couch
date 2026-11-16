import { describe, expect, it } from "vitest";
import { parseSettings, readSettings, SETTINGS_KEY } from "./settings";

const saved = {
  country: "IE",
  serviceIds: [8, 119],
  updatedAt: "2026-11-16T00:00:00.000Z",
};

describe("parseSettings", () => {
  it("reads a settings object", () => {
    expect(parseSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it("allows a country that has not been chosen", () => {
    expect(parseSettings(JSON.stringify({ ...saved, country: null }))).toEqual({
      ...saved,
      country: null,
    });
  });

  it("returns null for corrupt JSON", () => {
    expect(parseSettings("{")).toBeNull();
  });

  it("returns null when the shape does not match", () => {
    expect(parseSettings(JSON.stringify({ country: "IE" }))).toBeNull();
    expect(
      parseSettings(JSON.stringify({ ...saved, serviceIds: ["8"] })),
    ).toBeNull();
  });
});

describe("readSettings", () => {
  it("returns null when nothing is saved", () => {
    expect(readSettings({ getItem: () => null })).toBeNull();
  });

  it("returns null when storage throws", () => {
    expect(
      readSettings({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });

  it("reads the couch settings key", () => {
    expect(
      readSettings({
        getItem: (key) => (key === SETTINGS_KEY ? JSON.stringify(saved) : null),
      }),
    ).toEqual(saved);
  });
});
