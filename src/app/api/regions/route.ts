import { CATALOGUE_CACHE_CONTROL } from "@/config/cache";
import { toApiError } from "@/lib/tmdb/errors";
import { getRegions } from "@/lib/tmdb/client";

export async function GET() {
  try {
    const regions = await getRegions();
    const body = {
      regions: regions
        .map((region) => ({ code: region.code, name: region.englishName }))
        .sort((left, right) => left.name.localeCompare(right.name, "en")),
    };
    return Response.json(body, {
      headers: { "Cache-Control": CATALOGUE_CACHE_CONTROL },
    });
  } catch (error) {
    const apiError = toApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError.body, { status: apiError.status });
  }
}
