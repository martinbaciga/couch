import { TITLE_CACHE_CONTROL } from "@/config/cache";
import { normalizeProviders } from "@/lib/availability/normalize";
import type { Kind, TitlePage } from "@/lib/availability/types";
import { getMovie, getTv, getWatchProviders } from "@/lib/tmdb/client";
import { toApiError } from "@/lib/tmdb/errors";
import type { TitleDetails } from "@/lib/tmdb/types";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { kind, id } = await context.params;
  const mediaKind = parseKind(kind);
  const titleId = parseId(id);
  if (!mediaKind || titleId === null) return badRequest();

  try {
    const [details, providers] = await Promise.all([
      mediaKind === "movie" ? getMovie(titleId) : getTv(titleId),
      getWatchProviders(mediaKind, titleId),
    ]);
    return Response.json(
      {
        title: toTitle(details),
        availability: normalizeProviders(providers, providers.fetchedAt),
      },
      { headers: { "Cache-Control": TITLE_CACHE_CONTROL } },
    );
  } catch (error) {
    const apiError = toApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError.body, { status: apiError.status });
  }
}

function toTitle(details: TitleDetails): TitlePage {
  return {
    kind: details.kind,
    id: details.id,
    title: details.title,
    originalTitle: details.originalTitle,
    year: details.year,
    posterPath: details.posterPath,
    runtime: details.kind === "movie" ? details.runtimeMinutes : null,
    seasons: details.kind === "tv" ? details.numberOfSeasons : null,
    genres: details.genres.map((genre) => genre.name),
    overview: details.overview,
    certifications: details.ageRatings,
    imdbId: details.imdbId,
    trailerKey: details.trailerKey,
  };
}

function parseKind(value: string): Kind | null {
  return value === "movie" || value === "tv" ? value : null;
}

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function badRequest() {
  return Response.json(
    { error: { code: "bad_request", message: "bad_request" } },
    { status: 400 },
  );
}
