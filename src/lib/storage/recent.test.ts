import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecent,
  parseRecent,
  readRecent,
  RECENT_KEY,
  rememberRecent,
  removeRecent,
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

  it("keeps the newest ten and moves a repeat to the front", () => {
    const storage = memoryStorage();
    const ids = [550, 13, 680, 155, 78, 11, 12, 14, 15, 16, 17];
    for (const id of ids) {
      rememberRecent(storage, { ...fight, id, title: `Title ${id}` });
    }
    rememberRecent(storage, { ...fight, id: 550, title: "Title 550" });
    expect(readRecent(storage).map((title) => title.id)).toEqual([
      550, 17, 16, 15, 14, 12, 11, 78, 155, 680,
    ]);
  });

  it("removes one title and leaves the rest in order", () => {
    const storage = memoryStorage();
    const bear = { ...fight, id: 13, title: "The Bear" };
    rememberRecent(storage, fight);
    rememberRecent(storage, bear);
    expect(
      removeRecent(storage, "movie", 550).map((title) => title.id),
    ).toEqual([13]);
    expect(readRecent(storage)).toEqual([bear]);
  });

  it("clears the list without writing any other key", () => {
    const written: string[] = [];
    const storage: Pick<Storage, "getItem" | "setItem"> = {
      getItem: (key) =>
        key === RECENT_KEY ? JSON.stringify({ titles: [fight] }) : null,
      setItem: (key, value) => {
        written.push(`${key}:${value}`);
      },
    };
    expect(clearRecent(storage)).toEqual([]);
    expect(written).toEqual([
      `${RECENT_KEY}:${JSON.stringify({ titles: [] })}`,
    ]);
  });

  it("keeps a removal in memory when storage refuses the write", () => {
    const storage: Pick<Storage, "getItem" | "setItem"> = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    };
    rememberRecent(storage, fight);
    rememberRecent(storage, { ...fight, id: 13, title: "The Bear" });
    expect(
      removeRecent(storage, "movie", 550).map((title) => title.id),
    ).toEqual([13]);
    expect(clearRecent(storage)).toEqual([]);
    expect(readRecent(storage)).toEqual([]);
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
