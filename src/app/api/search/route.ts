import { SEARCH_CACHE_CONTROL } from "@/config/cache";
import { publicResult } from "@/lib/search/query";
import { searchMulti } from "@/lib/tmdb/client";
import { toApiError } from "@/lib/tmdb/errors";

const MAX_QUERY_LENGTH = 100;
const MAX_PAGE = 20;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const page = parsePage(params.get("page"));
  if (query.length < 1 || query.length > MAX_QUERY_LENGTH || page === null) {
    return badRequest();
  }

  try {
    const result = await searchMulti(query, page);
    return Response.json(
      {
        page: result.page,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        results: result.results.map(publicResult),
      },
      { headers: { "Cache-Control": SEARCH_CACHE_CONTROL } },
    );
  } catch (error) {
    const apiError = toApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError.body, { status: apiError.status });
  }
}

function parsePage(value: string | null): number | null {
  if (value === null) return 1;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return page <= MAX_PAGE ? page : null;
}

function badRequest() {
  return Response.json(
    { error: { code: "bad_request", message: "bad_request" } },
    { status: 400 },
  );
}
