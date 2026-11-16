import type { Kind } from "@/lib/availability/types";

export type TitleRef = {
  kind: Kind;
  id: number;
};

/** A title URL is `/title/movie|tv/` plus a positive integer id. */
export function parseTitleRef(kind: string, id: string): TitleRef | null {
  if (kind !== "movie" && kind !== "tv") return null;
  if (!/^[1-9]\d*$/.test(id)) return null;
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed)) return null;
  return { kind, id: parsed };
}
