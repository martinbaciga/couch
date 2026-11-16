/**
 * Region from a browser language tag, when that region is one we can offer.
 * `en-IE` and `en_IE` are Ireland. A tag with no region, or an unknown one, is empty.
 */
export function countryFromLanguage(
  language: string,
  regions: readonly string[],
): string | null {
  const tag = language.trim().replaceAll("_", "-");
  if (!tag) return null;
  const region = tag.split("-").findLast((part) => /^[a-zA-Z]{2}$/.test(part));
  if (!region) return null;
  const code = region.toUpperCase();
  return regions.includes(code) ? code : null;
}
