import type {
  Offer,
  OfferType,
  TitleAvailability,
} from "@/lib/availability/types";
import { resolveProvider } from "@/lib/services/resolve-provider";
import type {
  CountryOffers,
  WatchProvider,
  WatchProviders,
} from "@/lib/tmdb/types";

const BUCKETS: ReadonlyArray<{
  bucket: "flatrate" | "ads" | "free" | "rent" | "buy";
  type: OfferType;
}> = [
  { bucket: "flatrate", type: "stream" },
  { bucket: "ads", type: "ads" },
  { bucket: "free", type: "free" },
  { bucket: "rent", type: "rent" },
  { bucket: "buy", type: "buy" },
];

const VARIANT_RANK = { ads: 1, tier: 2, channel: 3 } as const;

export function normalizeProviders(
  raw: WatchProviders,
  fetchedAt: string,
): TitleAvailability {
  const countries: Record<string, Offer[]> = {};
  for (const [code, country] of Object.entries(raw.results)) {
    const offers = offersForCountry(country);
    if (offers.length > 0) countries[code] = offers;
  }
  return { countries, fetchedAt };
}

function offersForCountry(country: CountryOffers): Offer[] {
  const merged = new Map<string, Offer>();
  for (const { bucket, type } of BUCKETS) {
    for (const provider of country[bucket] ?? []) {
      const offer = toOffer(type, provider);
      const key = `${type}:${offer.serviceId}`;
      const existing = merged.get(key);
      merged.set(key, existing ? preferOffer(existing, offer) : offer);
    }
  }
  return [...merged.values()];
}

function toOffer(type: OfferType, provider: WatchProvider): Offer {
  const resolved = resolveProvider(provider.providerId, provider.providerName);
  const offer: Offer = {
    type,
    serviceId: resolved.serviceId,
    providerId: provider.providerId,
  };
  if (resolved.via) {
    offer.variant = "channel";
    offer.variantLabel = `via ${resolved.via}`;
  } else if (resolved.variant) {
    offer.variant = resolved.variant;
    if (resolved.variantLabel) offer.variantLabel = resolved.variantLabel;
  }
  return offer;
}

function preferOffer(current: Offer, incoming: Offer): Offer {
  if (!current.variant || !incoming.variant) {
    return current.variant ? incoming : current;
  }
  return VARIANT_RANK[incoming.variant] > VARIANT_RANK[current.variant]
    ? incoming
    : current;
}
