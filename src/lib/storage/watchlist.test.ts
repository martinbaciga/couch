import { describe, expect, it } from "vitest";
import { parseWatchlistSummary, readWatchlistSummary } from "./watchlist";

const saved = {
  importedAt: "2026-11-02T00:00:00.000Z",
  entries: [{ entry: { name: "Heat" } }, { entry: { name: "Ali" } }],
  summary: { computedAt: "2026-11-13T00:00:00.000Z" },
};

describe("parseWatchlistSummary", () => {
  it("counts the entries and keeps both dates", () => {
    expect(parseWatchlistSummary(JSON.stringify(saved))).toEqual({
      count: 2,
      importedAt: saved.importedAt,
      checkedAt: saved.summary.computedAt,
    });
  });

  it("allows a list that has not been checked yet", () => {
    const raw = JSON.stringify({ ...saved, summary: {} });
    expect(parseWatchlistSummary(raw)?.checkedAt).toBeNull();
  });

  it("returns null for a bad shape, corrupt JSON, or another version", () => {
    expect(parseWatchlistSummary("{")).toBeNull();
    expect(
      parseWatchlistSummary(JSON.stringify({ importedAt: saved.importedAt })),
    ).toBeNull();
    expect(
      parseWatchlistSummary(JSON.stringify({ ...saved, version: 2 })),
    ).toBeNull();
  });
});

describe("readWatchlistSummary", () => {
  it("returns null when storage throws or the key is missing", () => {
    expect(readWatchlistSummary({ getItem: () => null })).toBeNull();
    expect(
      readWatchlistSummary({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });
});
