import { describe, expect, it } from "vitest";
import {
  MAX_WATCHLIST_BYTES,
  MAX_WATCHLIST_ROWS,
  WatchlistParseError,
  importBlock,
  parseWatchlist,
} from "./parseWatchlist";

const HEADER = "Date,Name,Year,Letterboxd URI";

describe("parseWatchlist", () => {
  it("reads the Letterboxd example", () => {
    const text = `${HEADER}
2024-03-02,"Everything Everywhere All at Once",2022,https://boxd.it/abc
`;
    expect(parseWatchlist(text)).toEqual({
      entries: [
        {
          date: "2024-03-02",
          name: "Everything Everywhere All at Once",
          year: 2022,
          uri: "https://boxd.it/abc",
        },
      ],
      skipped: 0,
    });
  });

  it("keeps a comma inside quotes", () => {
    const text = `${HEADER}
2024-01-01,"Hello, World",2020,https://boxd.it/a
`;
    expect(parseWatchlist(text).entries[0]?.name).toBe("Hello, World");
  });

  it("unescapes quotes", () => {
    const text = `${HEADER}
2024-01-01,"Say ""Hello""",2020,https://boxd.it/a
`;
    expect(parseWatchlist(text).entries[0]?.name).toBe('Say "Hello"');
  });

  it("keeps a newline inside quotes", () => {
    const text = `${HEADER}
2024-01-01,"Line
break",2020,https://boxd.it/a
`;
    expect(parseWatchlist(text).entries[0]?.name).toBe("Line\nbreak");
  });

  it("strips a BOM and accepts CRLF", () => {
    const text = `\uFEFF${HEADER}\r\n2024-01-01,Heat,1995,https://boxd.it/a\r\n`;
    expect(parseWatchlist(text).entries).toEqual([
      {
        date: "2024-01-01",
        name: "Heat",
        year: 1995,
        uri: "https://boxd.it/a",
      },
    ]);
  });

  it("leaves a missing year empty", () => {
    const text = `${HEADER}
2024-01-01,Heat,,https://boxd.it/a
`;
    expect(parseWatchlist(text).entries[0]?.year).toBeNull();
  });

  it("rejects a header without Name and Year", () => {
    expect(() => parseWatchlist("Date,Title,Released\n1,Heat,1995\n")).toThrow(
      WatchlistParseError,
    );
    expect(() => parseWatchlist("")).toThrow(WatchlistParseError);
  });

  it("accepts Name and Year in any case", () => {
    const parsed = parseWatchlist("name,year\nHeat,1995\n");
    expect(parsed.entries).toEqual([
      { date: "", name: "Heat", year: 1995, uri: "" },
    ]);
  });

  it("returns no films for a header-only file", () => {
    expect(parseWatchlist(`${HEADER}\n`)).toEqual({ entries: [], skipped: 0 });
  });

  it("skips a row with no name and counts it", () => {
    const text = `${HEADER}
2024-01-01,,1995,https://boxd.it/a
2024-01-02,Heat,1995,https://boxd.it/b
`;
    expect(parseWatchlist(text)).toEqual({
      entries: [
        {
          date: "2024-01-02",
          name: "Heat",
          year: 1995,
          uri: "https://boxd.it/b",
        },
      ],
      skipped: 1,
    });
  });

  it("keeps duplicate rows", () => {
    const row = "2024-01-01,Heat,1995,https://boxd.it/a";
    const parsed = parseWatchlist(`${HEADER}\n${row}\n${row}\n`);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toEqual(parsed.entries[1]);
  });

  it("ignores a trailing blank line", () => {
    const text = `${HEADER}\n2024-01-01,Heat,1995,https://boxd.it/a\n\n`;
    expect(parseWatchlist(text).skipped).toBe(0);
    expect(parseWatchlist(text).entries).toHaveLength(1);
  });
});

describe("importBlock", () => {
  const one = {
    entries: [{ date: "", name: "Heat", year: 1995, uri: "" }],
    skipped: 0,
  };

  it("accepts a normal file", () => {
    expect(importBlock(one, 100)).toBeNull();
  });

  it("flags an empty list", () => {
    expect(importBlock({ entries: [], skipped: 0 }, 20)).toBe("empty");
  });

  it("flags a file past the size or row limit", () => {
    expect(importBlock(one, MAX_WATCHLIST_BYTES + 1)).toBe("too-big");
    expect(importBlock(one, MAX_WATCHLIST_BYTES)).toBeNull();
    const rows = {
      entries: Array.from(
        { length: MAX_WATCHLIST_ROWS },
        () => one.entries[0]!,
      ),
      skipped: 0,
    };
    expect(importBlock(rows, 100)).toBeNull();
    expect(importBlock({ ...rows, skipped: 1 }, 100)).toBe("too-big");
  });
});
