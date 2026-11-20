import { TITLE_REVALIDATE_SECONDS } from "@/config/cache";

const TMDB_API = "https://api.themoviedb.org/3";

export type TitleLookup = "missing" | "unavailable" | { title: string };

/**
 * The display title only, for the canonical-slug check.
 * The same field the title page uses, without the appended detail blocks.
 */
export async function lookupTitleName(
  kind: "movie" | "tv",
  id: number,
): Promise<TitleLookup> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return "unavailable";

  try {
    const response = await fetch(`${TMDB_API}/${kind}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      next: { revalidate: TITLE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return "missing";
    if (!response.ok) return "unavailable";
    const body: unknown = await response.json();
    const title = readTitle(body, kind);
    return title ? { title } : "unavailable";
  } catch {
    return "unavailable";
  }
}

function readTitle(body: unknown, kind: "movie" | "tv"): string | null {
  if (!isRecord(body)) return null;
  const value = body[kind === "movie" ? "title" : "name"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
