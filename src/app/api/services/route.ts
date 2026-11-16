import { CATALOGUE_CACHE_CONTROL } from "@/config/cache";
import {
  listCountryServices,
  mergeProviderCatalogues,
} from "@/lib/services/catalogue";
import { toApiError } from "@/lib/tmdb/errors";
import { getProviderCatalogue, getRegions } from "@/lib/tmdb/client";

export async function GET(request: Request) {
  const country = new URL(request.url).searchParams.get("country");
  if (!country || !/^[a-z]{2}$/i.test(country)) return badRequest();

  try {
    const regions = await getRegions();
    const code = country.toUpperCase();
    if (!regions.some((region) => region.code === code)) return badRequest();

    const [movies, series] = await Promise.all([
      getProviderCatalogue("movie", code),
      getProviderCatalogue("tv", code),
    ]);
    const { services, catalogue } = listCountryServices(
      mergeProviderCatalogues([movies, series]),
    );

    return Response.json(
      { country: code, services, catalogue },
      { headers: { "Cache-Control": CATALOGUE_CACHE_CONTROL } },
    );
  } catch (error) {
    const apiError = toApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError.body, { status: apiError.status });
  }
}

function badRequest() {
  return Response.json(
    { error: { code: "bad_request", message: "bad_request" } },
    { status: 400 },
  );
}
