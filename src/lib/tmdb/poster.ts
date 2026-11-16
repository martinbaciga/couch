export function posterUrl(path: string | null, size: string): string | null {
  if (!path) return null;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${normalised}`;
}
