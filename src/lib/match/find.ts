import "server-only";

import {
  matchTitle,
  normaliseTitle,
  type Candidate,
  type Match,
  type MatchEntry,
} from "@/lib/match/match";
import { searchMovie, searchTv } from "@/lib/tmdb/client";
import type { SearchHit } from "@/lib/tmdb/types";

/**
 * Stops at the first search that yields a confident match.
 * The year filter can hide a film whose date is still exact or a year
 * out, so the unfiltered film search is the net for that case. A film
 * more than a year off is not confident and falls through to series.
 */
export async function findMatches(
  entries: readonly MatchEntry[],
): Promise<Array<Match | null>> {
  return Promise.all(entries.map((entry) => findMatch(entry)));
}

async function findMatch(entry: MatchEntry): Promise<Match | null> {
  if (!normaliseTitle(entry.name)) return null;

  if (entry.year !== null) {
    const exact = await searchMovie(entry.name, entry.year);
    const exactHit = matchTitle(entry, toCandidates(exact.results));
    if (exactHit) return exactHit;

    const [earlier, later] = await Promise.all([
      searchMovie(entry.name, entry.year - 1),
      searchMovie(entry.name, entry.year + 1),
    ]);
    const nearHit = matchTitle(entry, [
      ...toCandidates(earlier.results),
      ...toCandidates(later.results),
    ]);
    if (nearHit) return nearHit;
  }

  const movies = await searchMovie(entry.name);
  const movieHit = matchTitle(entry, toCandidates(movies.results));
  if (movieHit) return movieHit;

  if (entry.year !== null) {
    const dated = await searchTv(entry.name, entry.year);
    const datedHit = matchTitle(entry, toCandidates(dated.results));
    if (datedHit) return datedHit;
  }

  const shows = await searchTv(entry.name);
  return matchTitle(entry, toCandidates(shows.results));
}

function toCandidates(results: readonly SearchHit[]): Candidate[] {
  return results.map((hit) => ({
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    originalTitle: hit.originalTitle,
    year: hit.year,
    posterPath: hit.posterPath,
    popularity: hit.popularity ?? 0,
  }));
}
