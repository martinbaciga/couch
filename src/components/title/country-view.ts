import type { CountryRow } from "@/lib/availability/status";
import type { Offer } from "@/lib/availability/types";

/** One offer type at a time. Stream is the default. */
export type CountryOfferFilter = "stream" | "free" | "rent-buy";

export type LogoMarker = "none" | "mine" | "plan";

const PREVIEW = 6;
const STORE_PREVIEW = 2;

/**
 * Keeps `byCountry` order and drops rows with no offer of the selected type.
 * Free / ads is either free or ads. Rent / buy is either rent or buy.
 */
export function rowsForFilter(
  rows: CountryRow[],
  filter: CountryOfferFilter,
): CountryRow[] {
  return rows.filter((row) => matchesFilter(row, filter));
}

/** First six rows, unless the list is open. */
export function previewRows<T>(rows: T[], open: boolean): T[] {
  return open ? rows : rows.slice(0, PREVIEW);
}

export function hiddenCount(total: number, open: boolean): number {
  if (open || total <= PREVIEW) return 0;
  return total - PREVIEW;
}

/**
 * Names for a rent, buy, or free cell.
 * Mobile keeps the first two, then a "+N more" count. Desktop keeps every name.
 */
export function storeNames(
  names: string[],
  compact: boolean,
): { shown: string[]; extra: number } {
  if (!compact || names.length <= STORE_PREVIEW) {
    return { shown: names, extra: 0 };
  }
  return {
    shown: names.slice(0, STORE_PREVIEW),
    extra: names.length - STORE_PREVIEW,
  };
}

/**
 * One logo per streaming service. Yours come first, in the order the offers
 * arrived. A dashed mark means every offer for that service is a plan variant.
 */
export function streamLogoMarks(
  offers: Offer[],
  mine: ReadonlySet<number>,
): { id: number; marker: LogoMarker }[] {
  const grouped = new Map<number, Offer[]>();
  for (const offer of offers) {
    const list = grouped.get(offer.serviceId) ?? [];
    list.push(offer);
    grouped.set(offer.serviceId, list);
  }

  const yours: { id: number; marker: LogoMarker }[] = [];
  const others: { id: number; marker: LogoMarker }[] = [];
  for (const [id, group] of grouped) {
    const plan = group.every(
      (offer) => offer.variant === "ads" || offer.variant === "tier",
    );
    let marker: LogoMarker = "none";
    if (plan) marker = "plan";
    else if (mine.has(id)) marker = "mine";
    const logo = { id, marker };
    if (mine.has(id)) yours.push(logo);
    else others.push(logo);
  }
  return [...yours, ...others];
}

function matchesFilter(row: CountryRow, filter: CountryOfferFilter): boolean {
  const offers = row.offersByType;
  if (filter === "stream") return offers.stream.length > 0;
  if (filter === "free") return offers.free.length > 0 || offers.ads.length > 0;
  return offers.rent.length > 0 || offers.buy.length > 0;
}
