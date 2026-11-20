import { describe, expect, it } from "vitest";
import {
  canonicalSlugRedirect,
  parseTitleRef,
  titlePath,
  titleRedirectForPath,
  titleSlug,
} from "./title-ref";

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

describe("titleSlug", () => {
  it("folds accents and turns punctuation into hyphens", () => {
    expect(titleSlug("Fight Club")).toBe("fight-club");
    expect(titleSlug("Amélie")).toBe("amelie");
    expect(titleSlug("Spider-Man: No Way Home")).toBe("spider-man-no-way-home");
    expect(titleSlug("Dr. Strangelove")).toBe("dr-strangelove");
    expect(titleSlug("Se7en")).toBe("se7en");
    expect(titleSlug("WALL·E")).toBe("wall-e");
  });

  it("is empty when the title has no letters or digits", () => {
    expect(titleSlug("")).toBe("");
    expect(titleSlug("   ")).toBe("");
    expect(titleSlug("!!!")).toBe("");
  });
});

describe("titlePath", () => {
  it("adds the slug, and leaves it off when the title cannot make one", () => {
    expect(titlePath("movie", 550, "Fight Club")).toBe(
      "/title/movie/550/fight-club",
    );
    expect(titlePath("movie", 550, "!!!")).toBe("/title/movie/550");
  });
});

describe("canonicalSlugRedirect", () => {
  it("renders a missing slug and redirects a wrong one", () => {
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", undefined),
    ).toBeNull();
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", "fight-club"),
    ).toBeNull();
    expect(canonicalSlugRedirect("movie", 550, "Fight Club", "fightclub")).toBe(
      "/title/movie/550/fight-club",
    );
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", "Fight-Club"),
    ).toBe("/title/movie/550/fight-club");
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", "fight-club/extra"),
    ).toBe("/title/movie/550/fight-club");
  });

  it("keeps the by-country view on the corrected link", () => {
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", "wrong", "country"),
    ).toBe("/title/movie/550/fight-club?view=country");
    expect(
      canonicalSlugRedirect("movie", 550, "Fight Club", "fight-club", "country"),
    ).toBeNull();
  });

  it("sends a slug on an empty title back to the id", () => {
    expect(canonicalSlugRedirect("tv", 1396, "", undefined)).toBeNull();
    expect(canonicalSlugRedirect("tv", 1396, "!!!", "breaking-bad")).toBe(
      "/title/tv/1396",
    );
  });
});

describe("titleRedirectForPath", () => {
  it("leaves a bare id and a correct slug alone", () => {
    expect(titleRedirectForPath("/title/movie/550", "Fight Club")).toBeNull();
    expect(
      titleRedirectForPath("/title/movie/550/fight-club", "Fight Club"),
    ).toBeNull();
  });

  it("corrects a wrong slug and keeps the by-country view", () => {
    expect(
      titleRedirectForPath("/title/movie/550/wrong", "Fight Club", "country"),
    ).toBe("/title/movie/550/fight-club?view=country");
  });
});
