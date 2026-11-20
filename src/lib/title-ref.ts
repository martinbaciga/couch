import type { Kind } from "@/lib/availability/types";

export type TitleRef = {
  kind: Kind;
  id: number;
};

/** A title URL is `/title/movie|tv/` plus a positive integer id, then a cosmetic slug. */
export function parseTitleRef(kind: string, id: string): TitleRef | null {
  if (kind !== "movie" && kind !== "tv") return null;
  if (!/^[1-9]\d*$/.test(id)) return null;
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed)) return null;
  return { kind, id: parsed };
}

/**
 * Cosmetic slug. Accents fold to ASCII, punctuation becomes a hyphen, and a
 * title with no letters or digits has no slug. The id is what the page resolves.
 */
export function titleSlug(title: string): string {
  const plain = title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return plain.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Canonical path. No query: `?view=country` is optional and not part of the link. */
export function titlePath(kind: Kind, id: number, title: string): string {
  const slug = titleSlug(title);
  const base = `/title/${kind}/${id}`;
  return slug ? `${base}/${slug}` : base;
}

/** One path segment, or the joined extra segments so a longer path cannot match. */
export function singleSlug(slug: string[] | undefined): string | undefined {
  if (!slug || slug.length === 0) return undefined;
  if (slug.length === 1) return slug[0];
  return slug.join("/");
}

/**
 * A missing slug still renders the page. Any other slug redirects to the
 * canonical path. `?view=country` is kept, because that view is allowed.
 */
export function canonicalSlugRedirect(
  kind: Kind,
  id: number,
  title: string,
  slug: string | undefined,
  view?: string | string[],
): string | null {
  if (slug === undefined) return null;
  const canonical = titlePath(kind, id, title);
  const requested = `/title/${kind}/${id}/${slug}`;
  if (requested === canonical) return null;
  return view === "country" ? `${canonical}?view=country` : canonical;
}

/** Where this path should go, once the real title is known. Null means stay. */
export function titleRedirectForPath(
  pathname: string,
  title: string,
  view?: string | null,
): string | null {
  const parts = pathname.split("/").filter((part) => part.length > 0);
  if (parts[0] !== "title" || parts.length < 3) return null;
  const kind = parts[1];
  const id = parts[2];
  if (!kind || !id) return null;
  const ref = parseTitleRef(kind, id);
  if (!ref) return null;
  const slug = parts.length === 3 ? undefined : parts.slice(3).join("/");
  return canonicalSlugRedirect(ref.kind, ref.id, title, slug, view ?? undefined);
}
