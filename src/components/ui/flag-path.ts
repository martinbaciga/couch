/** Path of a circle-flags SVG for an ISO country code. */
export function flagPath(code: string): string | null {
  const file = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(file)) return null;
  return `/flags/${file}.svg`;
}
