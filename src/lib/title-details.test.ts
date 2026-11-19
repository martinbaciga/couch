import { describe, expect, it } from "vitest";
import {
  homeCertification,
  titleLinks,
  titleMetaParts,
  type MetaFormat,
} from "./title-details";

const format: MetaFormat = {
  hours: (value) => unit(value, "hour"),
  minutes: (value) => unit(value, "minute"),
  units: (parts) =>
    new Intl.ListFormat("en", { type: "unit", style: "narrow" }).format(parts),
  genres: (names) =>
    new Intl.ListFormat("en", { type: "conjunction", style: "narrow" }).format(
      names,
    ),
  seasons: (count) => `${count} ${count === 1 ? "season" : "seasons"}`,
};

describe("titleMetaParts", () => {
  it("formats runtime, the first two genres, and the age rating", () => {
    expect(
      titleMetaParts(
        {
          kind: "movie",
          runtimeMinutes: 139,
          numberOfSeasons: 4,
          genres: ["Drama", "Thriller", "Crime"],
          certification: "18",
        },
        format,
      ),
    ).toEqual(["2h 19m", "Drama, Thriller", "18"]);
  });

  it("uses seasons for a series and drops a missing rating", () => {
    expect(
      titleMetaParts(
        {
          kind: "tv",
          runtimeMinutes: 47,
          numberOfSeasons: 3,
          genres: ["Drama"],
          certification: null,
        },
        format,
      ),
    ).toEqual(["3 seasons", "Drama"]);
  });

  it("leaves out every missing part", () => {
    expect(
      titleMetaParts(
        {
          kind: "movie",
          runtimeMinutes: null,
          numberOfSeasons: null,
          genres: ["", "  "],
          certification: "  ",
        },
        format,
      ),
    ).toEqual([]);
    expect(
      titleMetaParts(
        {
          kind: "tv",
          runtimeMinutes: 47,
          numberOfSeasons: null,
          genres: [],
          certification: null,
        },
        format,
      ),
    ).toEqual([]);
    expect(
      titleMetaParts(
        {
          kind: "movie",
          runtimeMinutes: 45,
          numberOfSeasons: null,
          genres: [],
          certification: null,
        },
        format,
      ),
    ).toEqual(["45m"]);
  });
});

describe("homeCertification", () => {
  it("uses the home country and nothing when that country is unset or unrated", () => {
    const ratings = { IE: "15A", US: "R" };
    expect(homeCertification(ratings, "IE")).toBe("15A");
    expect(homeCertification(ratings, "ie")).toBe("15A");
    expect(homeCertification(ratings, "FR")).toBeNull();
    expect(homeCertification(ratings, null)).toBeNull();
    expect(homeCertification({ IE: "  " }, "IE")).toBeNull();
  });
});

describe("titleLinks", () => {
  it("builds the three outbound links for a film", () => {
    expect(
      titleLinks({
        kind: "movie",
        id: 550,
        imdbId: "tt0137523",
        trailerKey: "SUXWAEX2jlg",
      }),
    ).toEqual([
      { service: "letterboxd", href: "https://letterboxd.com/tmdb/550" },
      { service: "imdb", href: "https://www.imdb.com/title/tt0137523/" },
      {
        service: "trailer",
        href: "https://www.youtube.com/watch?v=SUXWAEX2jlg",
      },
    ]);
  });

  it("hides Letterboxd for a series and hides a link whose id is missing", () => {
    expect(
      titleLinks({
        kind: "tv",
        id: 1396,
        imdbId: null,
        trailerKey: "not a key",
      }),
    ).toEqual([]);
    expect(
      titleLinks({
        kind: "movie",
        id: 550,
        imdbId: "nm0000093",
        trailerKey: null,
      }),
    ).toEqual([
      { service: "letterboxd", href: "https://letterboxd.com/tmdb/550" },
    ]);
  });
});

function unit(value: number, unitName: "hour" | "minute"): string {
  return new Intl.NumberFormat("en", {
    style: "unit",
    unit: unitName,
    unitDisplay: "narrow",
  }).format(value);
}
