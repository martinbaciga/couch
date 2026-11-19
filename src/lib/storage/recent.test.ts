import { beforeEach, describe, expect, it } from "vitest";
import {
  parseRecent,
  readRecent,
  rememberRecent,
  resetRecentStore,
  type RecentTitle,
} from "./recent";

const fight: RecentTitle = {
  kind: "movie",
  id: 550,
  title: "Fight Club",
  year: 1999,
  posterPath: "/fight.jpg",
};

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  };
}

describe("recent titles", () => {
  beforeEach(() => {
    resetRecentStore();
  });

  it("reads an empty list from a bad value", () => {
    expect(parseRecent("{")).toEqual([]);
    expect(parseRecent(JSON.stringify({ titles: [{ id: 1 }] }))).toEqual([]);
  });

  it("keeps the newest five and moves a repeat to the front", () => {
    const storage = memoryStorage();
    const titles = [550, 13, 680, 155, 78].map((id) => ({
      ...fight,
      id,
      title: `Title ${id}`,
    }));
    for (const title of titles) rememberRecent(storage, title);
    const again = titles[0];
    if (!again) throw new Error("missing title");
    rememberRecent(storage, again);
    const saved = readRecent(storage);
    expect(saved.map((title) => title.id)).toEqual([550, 78, 155, 680, 13]);
  });

  it("keeps the list in memory when storage refuses the write", () => {
    const storage: Pick<Storage, "getItem" | "setItem"> = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    };
    const saved = rememberRecent(storage, fight);
    expect(saved).toEqual([fight]);
    expect(readRecent(storage)).toEqual([fight]);
  });
});
