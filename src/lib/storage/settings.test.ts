import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCouchData,
  parseSettings,
  readSettings,
  resetSettingsStore,
  SETTINGS_KEY,
  settingsFromMemory,
  writeSettings,
} from "./settings";

const saved = {
  country: "IE",
  serviceIds: [8, 119],
  updatedAt: "2026-11-16T00:00:00.000Z",
};

describe("parseSettings", () => {
  beforeEach(() => {
    resetSettingsStore();
  });
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

  it("rejects a non-integer service id", () => {
    expect(
      parseSettings(JSON.stringify({ ...saved, serviceIds: [8, 1.5] })),
    ).toBeNull();
  });

  it("rejects a stored object from another version", () => {
    expect(parseSettings(JSON.stringify({ ...saved, version: 2 }))).toBeNull();
  });
});

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("writeSettings", () => {
  beforeEach(() => {
    resetSettingsStore();
  });

  it("round-trips through storage", () => {
    const storage = memory();
    writeSettings(storage, saved);
    expect(readSettings(storage)).toEqual(saved);
    expect(settingsFromMemory()).toBe(false);
  });

  it("keeps the value in memory when storage throws", () => {
    const storage = memory();
    storage.setItem = () => {
      throw new Error("blocked");
    };
    writeSettings(storage, saved);
    expect(readSettings(storage)).toEqual(saved);
    expect(settingsFromMemory()).toBe(true);
  });

  it("clears every couch key and leaves the rest", () => {
    const storage = memory();
    storage.setItem(SETTINGS_KEY, JSON.stringify(saved));
    storage.setItem("couch:watchlist:v1", "{}");
    storage.setItem("other", "keep");
    clearCouchData(storage);
    expect(storage.getItem(SETTINGS_KEY)).toBeNull();
    expect(storage.getItem("couch:watchlist:v1")).toBeNull();
    expect(storage.getItem("other")).toBe("keep");
    expect(readSettings(storage)).toBeNull();
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
