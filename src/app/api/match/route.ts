import { findMatches } from "@/lib/match/find";
import type { MatchEntry } from "@/lib/match/match";
import { toApiError } from "@/lib/tmdb/errors";

const MAX_BATCH = 10;
const MAX_NAME_LENGTH = 300;

export async function POST(request: Request) {
  const entries = await readEntries(request);
  if (!entries) return badRequest();

  try {
    const matches = await findMatches(entries);
    return Response.json({ matches });
  } catch (error) {
    const apiError = toApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError.body, { status: apiError.status });
  }
}

async function readEntries(request: Request): Promise<MatchEntry[] | null> {
  try {
    return parseEntries(await request.json());
  } catch {
    return null;
  }
}

function parseEntries(value: unknown): MatchEntry[] | null {
  if (!isRecord(value) || !Array.isArray(value.entries)) return null;
  if (value.entries.length > MAX_BATCH) return null;
  const entries: MatchEntry[] = [];
  for (const item of value.entries) {
    const entry = parseEntry(item);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

function parseEntry(value: unknown): MatchEntry | null {
  if (!isRecord(value) || typeof value.name !== "string") return null;
  const name = value.name.trim();
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  if (value.year === null) return { name, year: null };
  if (!isYear(value.year)) return null;
  return { name, year: value.year };
}

function badRequest() {
  return Response.json(
    { error: { code: "bad_request", message: "bad_request" } },
    { status: 400 },
  );
}

function isYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
