import type { Kind } from "@/lib/availability/types";

export const RECENT_KEY = "couch:recent:v1";
const MAX_RECENT = 5;

export type RecentTitle = {
  kind: Kind;
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

let memory: RecentTitle[] | null = null;
let usingMemory = false;

export function resetRecentStore(): void {
  memory = null;
  usingMemory = false;
}

export function isRecentMemory(): boolean {
  return usingMemory;
}

/** Newest first, at most five. A bad value reads as an empty list. */
export function parseRecent(raw: string): RecentTitle[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !Array.isArray(value.titles)) return [];
    return value.titles.filter(isRecentTitle).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function readRecent(storage: Pick<Storage, "getItem">): RecentTitle[] {
  if (usingMemory) return memory ?? [];
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (raw === null) return [];
    return parseRecent(raw);
  } catch {
    return [];
  }
}

/** Puts the title first and drops the oldest past five. */
export function rememberRecent(
  storage: StorageLike,
  title: RecentTitle,
): RecentTitle[] {
  const next = [
    title,
    ...readRecent(storage).filter(
      (item) => item.kind !== title.kind || item.id !== title.id,
    ),
  ].slice(0, MAX_RECENT);
  const body = JSON.stringify({ titles: next });
  try {
    storage.setItem(RECENT_KEY, body);
    usingMemory = false;
    memory = null;
  } catch {
    memory = next;
    usingMemory = true;
  }
  return next;
}

function isRecentTitle(value: unknown): value is RecentTitle {
  if (!isRecord(value)) return false;
  if (value.kind !== "movie" && value.kind !== "tv") return false;
  if (
    typeof value.id !== "number" ||
    !Number.isInteger(value.id) ||
    value.id < 1
  ) {
    return false;
  }
  if (typeof value.title !== "string" || value.title.length === 0) return false;
  if (
    value.year !== null &&
    (typeof value.year !== "number" || !Number.isInteger(value.year))
  ) {
    return false;
  }
  if (value.posterPath !== null && typeof value.posterPath !== "string") {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
