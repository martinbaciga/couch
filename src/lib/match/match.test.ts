import { describe, expect, it } from "vitest";

import { matchTitle, type Candidate } from "./match";

describe("matchTitle", () => {
  it("matches an equal title and year", () => {
    const chosen = matchTitle({ name: "Heat", year: 1995 }, [
      candidate({ id: 1, title: "Heat", year: 1995, posterPath: "/heat.jpg" }),
    ]);

    expect(chosen).toEqual({
      kind: "movie",
      id: 1,
      title: "Heat",
      year: 1995,
      posterPath: "/heat.jpg",
      confidence: "exact",
    });
  });

  it("accepts a year either side", () => {
    const chosen = matchTitle({ name: "Dune", year: 2020 }, [
      candidate({ id: 1, title: "Dune", year: 1984, popularity: 100 }),
      candidate({ id: 2, title: "Dune", year: 2021, popularity: 5 }),
    ]);

    expect(chosen).toMatchObject({ id: 2, year: 2021, confidence: "near" });
  });

  it("matches a row with no year as a loose film", () => {
    const chosen = matchTitle({ name: "Heat", year: null }, [
      candidate({ id: 1, title: "Heat", year: 1995 }),
    ]);

    expect(chosen).toMatchObject({ id: 1, confidence: "loose" });
  });

  it("matches Amélie once accents are removed", () => {
    const chosen = matchTitle({ name: "Amélie", year: 2001 }, [
      candidate({ id: 194, title: "Amelie", year: 2001 }),
    ]);

    expect(chosen).toMatchObject({ id: 194, confidence: "exact" });
  });

  it("ignores punctuation", () => {
    const chosen = matchTitle({ name: "Spider-Man", year: 2002 }, [
      candidate({ id: 1, title: "Spider Man", year: 2002 }),
    ]);

    expect(chosen).toMatchObject({ id: 1, confidence: "exact" });
  });

  it("drops a leading The from either side", () => {
    const fromRow = matchTitle({ name: "The Matrix", year: 1999 }, [
      candidate({ id: 1, title: "Matrix", year: 1999 }),
    ]);
    const fromTitle = matchTitle({ name: "Matrix", year: 1999 }, [
      candidate({ id: 2, title: "The Matrix", year: 1999 }),
    ]);
    const theatre = matchTitle({ name: "Theatre", year: 2020 }, [
      candidate({ id: 3, title: "The Atre", year: 2020 }),
    ]);

    expect(fromRow).toMatchObject({ id: 1, confidence: "exact" });
    expect(fromTitle).toMatchObject({ id: 2, confidence: "exact" });
    expect(theatre).toBeNull();
  });

  it("matches the original title of a non-English film", () => {
    const chosen = matchTitle({ name: "El laberinto del fauno", year: 2006 }, [
      candidate({
        id: 1,
        title: "Pan's Labyrinth",
        originalTitle: "El laberinto del fauno",
        year: 2006,
      }),
    ]);

    expect(chosen).toMatchObject({
      id: 1,
      title: "Pan's Labyrinth",
      confidence: "exact",
    });
  });

  it("falls back to a series when no film year is close", () => {
    const chosen = matchTitle({ name: "The Office", year: 2005 }, [
      candidate({ id: 1, title: "The Office", year: 1969, popularity: 50 }),
      candidate({
        id: 2,
        kind: "tv",
        title: "The Office",
        year: 2005,
        popularity: 10,
      }),
    ]);

    expect(chosen).toMatchObject({ id: 2, kind: "tv", confidence: "loose" });
  });

  it("prefers an exact film over a series with the same name", () => {
    const chosen = matchTitle({ name: "Heat", year: 1995 }, [
      candidate({
        id: 1,
        kind: "tv",
        title: "Heat",
        year: 1995,
        popularity: 99,
      }),
      candidate({ id: 2, title: "Heat", year: 1995, popularity: 1 }),
    ]);

    expect(chosen).toMatchObject({ id: 2, kind: "movie", confidence: "exact" });
  });

  it("keeps the film whose year matches when the name is shared", () => {
    const chosen = matchTitle({ name: "Dune", year: 1984 }, [
      candidate({ id: 1, title: "Dune", year: 2021, popularity: 100 }),
      candidate({ id: 2, title: "Dune", year: 1984, popularity: 5 }),
    ]);

    expect(chosen).toMatchObject({ id: 2, year: 1984, confidence: "exact" });
  });

  it("returns null when the only film is more than a year off", () => {
    expect(
      matchTitle({ name: "Dune", year: 2010 }, [
        candidate({ id: 1, title: "Dune", year: 1984 }),
        candidate({ id: 2, title: "Dune", year: 2021 }),
      ]),
    ).toBeNull();
    expect(matchTitle({ name: "Missing", year: 1999 }, [])).toBeNull();
  });

  it("breaks a tie toward the more popular title", () => {
    const chosen = matchTitle({ name: "Heat", year: 1995 }, [
      candidate({ id: 1, title: "Heat", year: 1995, popularity: 4 }),
      candidate({ id: 2, title: "Heat", year: 1995, popularity: 40 }),
      candidate({ id: 3, title: "Heat", year: 1995, popularity: 40 }),
    ]);

    expect(chosen).toMatchObject({ id: 2 });
  });
});

function candidate(
  overrides: Partial<Candidate> & { id: number; title: string },
): Candidate {
  return {
    kind: "movie",
    originalTitle: overrides.title,
    year: 1999,
    posterPath: null,
    popularity: 1,
    ...overrides,
  };
}
