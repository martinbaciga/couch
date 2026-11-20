const MAX_RETURN_LENGTH = 200;

/**
 * Same-origin path worth linking back to, or null when it must not be followed.
 * A hash is dropped so the return opens the page, not a scroll position.
 */
export function safeReturnPath(value: string | null): string | null {
  if (value === null || value.length > MAX_RETURN_LENGTH) return null;
  const hash = value.indexOf("#");
  const path = hash === -1 ? value : value.slice(0, hash);
  if (path.length === 0) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\")) return null;
  if (containsScheme(path)) return null;
  const pathname = path.split("?", 1)[0] ?? path;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return null;
  }
  return path;
}

/** Settings URL that comes back to `currentPath`, or `/settings` when that path is not safe. */
export function settingsHref(currentPath: string): string {
  const path = safeReturnPath(currentPath);
  if (path === null) return "/settings";
  return `/settings?return=${encodeURIComponent(path)}`;
}

export type BackPlace = "title" | "home" | "results" | "back";

/** Which back-link label fits a path that `safeReturnPath` has already accepted. */
export function backLabel(path: string): BackPlace {
  const pathname = path.split("?", 1)[0] ?? path;
  if (pathname === "/") return "home";
  if (pathname === "/search" || pathname.startsWith("/search/")) {
    return "results";
  }
  if (pathname.startsWith("/title/")) return "title";
  return "back";
}

/** A URI scheme, including one carried inside a query (`https:`, `javascript:`). */
function containsScheme(path: string): boolean {
  return /[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
}
