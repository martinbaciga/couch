export type MatchConfidence = "exact" | "near" | "loose";

export type MatchEntry = {
  name: string;
  year: number | null;
};

export type Candidate = {
  kind: "movie" | "tv";
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  posterPath: string | null;
  popularity: number;
};

export type Match = {
  kind: "movie" | "tv";
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  confidence: MatchConfidence;
};

const LEADING_THE = /^the /;

/**
 * Lower case, accents and punctuation removed, spaces collapsed, and a
 * leading "the" dropped. Both the watchlist row and the TMDB title go
 * through this before they are compared.
 */
export function normaliseTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(LEADING_THE, "");
}

/**
 * Picks one candidate, or null when nothing is confident.
 * A film matches on an equal year, then a year either side. A film whose
 * year is further off is left for the unmatched list. No year on the row,
 * and any series, are loose matches. Equal candidates keep the higher
 * popularity, then the earlier one.
 */
export function matchTitle(
  entry: MatchEntry,
  candidates: readonly Candidate[],
): Match | null {
  const name = normaliseTitle(entry.name);
  if (!name) return null;

  const titled = candidates.filter((candidate) => sameTitle(candidate, name));
  const movies = titled.filter((candidate) => candidate.kind === "movie");
  const shows = titled.filter((candidate) => candidate.kind === "tv");

  const year = entry.year;
  if (year === null) {
    const loose = best(movies);
    if (loose) return toMatch(loose, "loose");
  } else {
    const exact = best(movies.filter((candidate) => candidate.year === year));
    if (exact) return toMatch(exact, "exact");
    const near = best(
      movies.filter((candidate) => yearsApart(candidate.year, year) === 1),
    );
    if (near) return toMatch(near, "near");
  }

  if (year !== null) {
    const exactShow = best(
      shows.filter((candidate) => candidate.year === year),
    );
    if (exactShow) return toMatch(exactShow, "loose");
    const nearShow = best(
      shows.filter((candidate) => yearsApart(candidate.year, year) === 1),
    );
    if (nearShow) return toMatch(nearShow, "loose");
  }

  const show = best(shows);
  if (show) return toMatch(show, "loose");
  return null;
}

function sameTitle(candidate: Candidate, name: string): boolean {
  return [candidate.title, candidate.originalTitle].some(
    (title) => normaliseTitle(title) === name,
  );
}

function yearsApart(
  candidateYear: number | null,
  entryYear: number,
): number | null {
  if (candidateYear === null) return null;
  return Math.abs(candidateYear - entryYear);
}

function best(candidates: readonly Candidate[]): Candidate | null {
  let chosen: Candidate | null = null;
  for (const candidate of candidates) {
    if (!chosen || candidate.popularity > chosen.popularity) {
      chosen = candidate;
    }
  }
  return chosen;
}

function toMatch(candidate: Candidate, confidence: MatchConfidence): Match {
  return {
    kind: candidate.kind,
    id: candidate.id,
    title: candidate.title,
    year: candidate.year,
    posterPath: candidate.posterPath,
    confidence,
  };
}
