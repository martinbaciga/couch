/** Lower case, with accents removed, for a "contains" match. */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function containsFolded(haystack: string, needle: string): boolean {
  const query = fold(needle.trim());
  if (!query) return true;
  return fold(haystack).includes(query);
}
