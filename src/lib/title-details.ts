export type MetaInput = {
  kind: "movie" | "tv";
  runtimeMinutes: number | null;
  numberOfSeasons: number | null;
  genres: readonly string[];
  certification: string | null;
};

/**
 * Formatting comes from the caller so the page can use next-intl.
 * Node 22 has no `Intl.DurationFormat`; narrow hour and minute units
 * joined as a unit list are the Intl form of "2h 19m".
 */
export type MetaFormat = {
  hours: (value: number) => string;
  minutes: (value: number) => string;
  units: (parts: readonly string[]) => string;
  genres: (names: readonly string[]) => string;
  seasons: (count: number) => string;
};

export type TitleLinkService = "letterboxd" | "imdb" | "trailer";

export type TitleLink = {
  service: TitleLinkService;
  href: string;
};

const IMDB_ID = /^tt\d{7,10}$/;
const TRAILER_KEY = /^[A-Za-z0-9_-]{11}$/;

/** The home-country age rating, or none when the country is unset or unrated. */
export function homeCertification(
  ratings: Record<string, string>,
  country: string | null,
): string | null {
  if (!country) return null;
  return present(ratings[country] ?? ratings[country.toUpperCase()]);
}

/**
 * Runtime (or seasons, for a series), the first two genres, then the
 * age rating. A missing part is left out. An empty list means no line.
 */
export function titleMetaParts(input: MetaInput, format: MetaFormat): string[] {
  const parts: string[] = [];
  const length =
    input.kind === "tv" ? seasons(input, format) : runtime(input, format);
  if (length) parts.push(length);
  const names = input.genres
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 2);
  if (names.length > 0) parts.push(format.genres(names));
  const certification = present(input.certification);
  if (certification) parts.push(certification);
  return parts;
}

/** Letterboxd for films, then IMDb and the trailer when their ids are real. */
export function titleLinks(input: {
  kind: "movie" | "tv";
  id: number;
  imdbId: string | null;
  trailerKey: string | null;
}): TitleLink[] {
  const links: TitleLink[] = [];
  if (input.kind === "movie" && Number.isInteger(input.id) && input.id > 0) {
    links.push({
      service: "letterboxd",
      href: `https://letterboxd.com/tmdb/${input.id}`,
    });
  }
  if (input.imdbId && IMDB_ID.test(input.imdbId)) {
    links.push({
      service: "imdb",
      href: `https://www.imdb.com/title/${input.imdbId}/`,
    });
  }
  if (input.trailerKey && TRAILER_KEY.test(input.trailerKey)) {
    links.push({
      service: "trailer",
      href: `https://www.youtube.com/watch?v=${input.trailerKey}`,
    });
  }
  return links;
}

function runtime(input: MetaInput, format: MetaFormat): string | null {
  const minutes = input.runtimeMinutes;
  if (minutes === null || !Number.isInteger(minutes) || minutes <= 0)
    return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(format.hours(hours));
  if (rest > 0) parts.push(format.minutes(rest));
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0] ?? null;
  return format.units(parts);
}

function seasons(input: MetaInput, format: MetaFormat): string | null {
  const count = input.numberOfSeasons;
  if (count === null || !Number.isInteger(count) || count <= 0) return null;
  return format.seasons(count);
}

function present(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
