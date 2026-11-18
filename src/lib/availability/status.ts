import type {
  Offer,
  OfferType,
  TitleAvailability,
} from "@/lib/availability/types";

export type Settings = {
  country: string | null;
  serviceIds: number[];
};

export type PlanNote = {
  variant: "ads" | "tier";
  variantLabel: string;
};

export type Situation =
  | { status: "no-settings" }
  | { status: "no-services" }
  | { status: "no-data" }
  | { status: "on-my-service" }
  | { status: "specific-plan-only"; plans: PlanNote[] }
  | { status: "on-other-services-here" }
  | { status: "not-on-my-services" };

export type HomeDetails = {
  streamOnMyServices: Offer[];
  streamOnOtherServices: Offer[];
  freeOrAds: Offer[];
  rent: Offer[];
  buy: Offer[];
};

export type CountryTier = {
  country: string;
  tierOnly: boolean;
  /** Set when every streaming offer in that country is a plan variant. */
  variantLabel?: string;
};

export type MyServiceCountries = {
  serviceId: number;
  countries: CountryTier[];
};

export type OtherServiceCountries = MyServiceCountries & {
  countryCount: number;
};

export type OffersByType = Record<OfferType, Offer[]>;

export type CountryRow = {
  country: string;
  offersByType: OffersByType;
  hasMyService: boolean;
};

export type OtherCountries = {
  myServices: MyServiceCountries[];
  otherServices: OtherServiceCountries[];
  byCountry: CountryRow[];
  totalCountries: number;
  myServicesCountryCount: number;
};

/** Headline for the other-countries block. Counts come from `getOtherCountries`. */
export type OtherCountriesHeadline =
  | { kind: "also-countries"; countries: number }
  | { kind: "also-service"; serviceId: number; countries: number }
  | { kind: "your-services"; services: number; countries: number }
  | { kind: "none" };

export type WatchlistCategory =
  | { category: "on-my-services-here"; planOnly: boolean }
  | { category: "streaming-here" }
  | { category: "free-or-ads-here" }
  | { category: "other-services-here" }
  | { category: "rent-or-buy-here-only" }
  | { category: "other-countries-only" }
  | { category: "no-data" };

const regionNames = new Intl.DisplayNames("en", { type: "region" });

/**
 * A service is mine when its id is selected. Plan variants belong to that
 * parent. A channel is its own service. Streaming offers are stream, ads and
 * free. Rent and buy are never on a service.
 *
 * no-settings when the country is missing. no-services when the country is
 * set and no services are selected. no-data when nowhere has an offer.
 * on-my-service when home has a streaming offer of mine that is not plan-only.
 * specific-plan-only when home has my streaming offer only on a plan variant.
 * on-other-services-here when home streams on a service that is not mine.
 * not-on-my-services is everything else, and the only case for rent and buy.
 */
export function getSituation(
  availability: TitleAvailability,
  settings: Settings,
): Situation {
  if (settings.country === null) return { status: "no-settings" };
  if (settings.serviceIds.length === 0) return { status: "no-services" };
  if (!hasAnyOffer(availability)) return { status: "no-data" };

  const mine = new Set(settings.serviceIds);
  const myStreaming = offersFor(availability, settings.country).filter(
    (offer) => isStreaming(offer) && mine.has(offer.serviceId),
  );
  if (myStreaming.some((offer) => !isPlanVariant(offer))) {
    return { status: "on-my-service" };
  }
  if (myStreaming.length > 0) {
    return { status: "specific-plan-only", plans: planNotes(myStreaming) };
  }
  const otherStreaming = offersFor(availability, settings.country).some(
    (offer) => isStreaming(offer) && !mine.has(offer.serviceId),
  );
  if (otherStreaming) return { status: "on-other-services-here" };
  return { status: "not-on-my-services" };
}

/** Home-country offers split into the card groups. Nothing is mine when no services are selected. */
export function getHomeDetails(
  availability: TitleAvailability,
  settings: Settings,
): HomeDetails {
  const home =
    settings.country === null ? [] : offersFor(availability, settings.country);
  const mine = new Set(settings.serviceIds);
  return {
    streamOnMyServices: home.filter(
      (offer) => offer.type === "stream" && mine.has(offer.serviceId),
    ),
    streamOnOtherServices: home.filter(
      (offer) => offer.type === "stream" && !mine.has(offer.serviceId),
    ),
    freeOrAds: home.filter(
      (offer) => offer.type === "ads" || offer.type === "free",
    ),
    rent: home.filter((offer) => offer.type === "rent"),
    buy: home.filter((offer) => offer.type === "buy"),
  };
}

/**
 * Other countries, with home left out. My services and other services are
 * ordered by how many countries they cover, then by id. Countries are
 * alphabetical by English name. byCountry is my services, then any streaming
 * offer, then rent or buy only.
 */
export function getOtherCountries(
  availability: TitleAvailability,
  settings: Settings,
): OtherCountries {
  const mine = new Set(settings.serviceIds);
  const entries = otherEntries(availability, settings.country);
  const byService = streamingByService(entries);
  const myServices = [...mine]
    .flatMap((serviceId) => {
      const countries = byService.get(serviceId);
      if (!countries) return [];
      return [{ serviceId, countries: countryTiers(countries) }];
    })
    .sort(byCoverage);

  const otherServices = [...byService.keys()]
    .filter((serviceId) => !mine.has(serviceId))
    .map((serviceId) => {
      const countries = countryTiers(byService.get(serviceId) ?? new Map());
      return { serviceId, countries, countryCount: countries.length };
    })
    .sort(byCoverage);

  const byCountry = entries
    .filter(([, offers]) => offers.length > 0)
    .map(([country, offers]) => ({
      country,
      offersByType: offersByType(offers),
      hasMyService: offers.some(
        (offer) => isStreaming(offer) && mine.has(offer.serviceId),
      ),
    }))
    .sort(
      (a, b) =>
        countryRank(a) - countryRank(b) ||
        compareCountries(a.country, b.country),
    );

  const myServiceCountries = new Set(
    myServices.flatMap((service) =>
      service.countries.map((country) => country.country),
    ),
  );

  return {
    myServices,
    otherServices,
    byCountry,
    totalCountries: entries.filter(([, offers]) => offers.some(isStreaming))
      .length,
    myServicesCountryCount: myServiceCountries.size,
  };
}

/**
 * Which headline the block shows.
 * A specific plan names the service when only one of yours has it elsewhere.
 * Otherwise the count is how many of your services carry it, and how many
 * countries those services cover. With none of yours, the other-services
 * list still follows.
 */
export function otherCountriesHeadline(
  situation: Situation,
  other: OtherCountries,
): OtherCountriesHeadline {
  const onlyMine =
    other.myServices.length === 1 ? other.myServices[0] : undefined;

  if (situation.status === "on-my-service" && other.totalCountries > 0) {
    return {
      kind: "also-countries",
      countries: other.totalCountries,
    };
  }

  if (situation.status === "specific-plan-only" && onlyMine) {
    return {
      kind: "also-service",
      serviceId: onlyMine.serviceId,
      countries: onlyMine.countries.length,
    };
  }

  if (situation.status === "specific-plan-only" && other.totalCountries > 0) {
    return {
      kind: "also-countries",
      countries: other.totalCountries,
    };
  }

  if (other.myServices.length > 0) {
    return {
      kind: "your-services",
      services: other.myServices.length,
      countries: other.myServicesCountryCount,
    };
  }

  return { kind: "none" };
}

/**
 * First match wins, so each title has one watchlist category. On your
 * services covers a normal offer and a plan-only offer. With no services
 * selected, a stream offer at home is streaming-here instead.
 */
export function getWatchlistCategory(
  availability: TitleAvailability,
  settings: Settings,
): WatchlistCategory {
  const home =
    settings.country === null ? [] : offersFor(availability, settings.country);
  const mine = new Set(settings.serviceIds);

  if (settings.serviceIds.length === 0) {
    if (home.some((offer) => offer.type === "stream")) {
      return { category: "streaming-here" };
    }
  } else {
    const situation = getSituation(availability, settings);
    if (situation.status === "on-my-service") {
      return { category: "on-my-services-here", planOnly: false };
    }
    if (situation.status === "specific-plan-only") {
      return { category: "on-my-services-here", planOnly: true };
    }
  }

  if (home.some((offer) => offer.type === "ads" || offer.type === "free")) {
    return { category: "free-or-ads-here" };
  }
  if (
    home.some((offer) => offer.type === "stream" && !mine.has(offer.serviceId))
  ) {
    return { category: "other-services-here" };
  }
  if (
    home.length > 0 &&
    home.every((offer) => offer.type === "rent" || offer.type === "buy")
  ) {
    return { category: "rent-or-buy-here-only" };
  }
  if (home.length === 0 && hasAnyOffer(availability)) {
    return { category: "other-countries-only" };
  }
  return { category: "no-data" };
}

function offersFor(availability: TitleAvailability, country: string): Offer[] {
  const code = country.toUpperCase();
  const direct = availability.countries[code];
  if (direct) return direct;
  const match = Object.entries(availability.countries).find(
    ([key]) => key.toUpperCase() === code,
  );
  return match?.[1] ?? [];
}

function otherEntries(
  availability: TitleAvailability,
  country: string | null,
): [string, Offer[]][] {
  const home = country?.toUpperCase() ?? null;
  return Object.entries(availability.countries).filter(
    ([code]) => code.toUpperCase() !== home,
  );
}

function hasAnyOffer(availability: TitleAvailability): boolean {
  return Object.values(availability.countries).some(
    (offers) => offers.length > 0,
  );
}

function isStreaming(offer: Offer): boolean {
  return (
    offer.type === "stream" || offer.type === "ads" || offer.type === "free"
  );
}

function isPlanVariant(
  offer: Offer,
): offer is Offer & { variant: "ads" | "tier" } {
  return offer.variant === "ads" || offer.variant === "tier";
}

function planNotes(offers: Offer[]): PlanNote[] {
  const notes: PlanNote[] = [];
  const seen = new Set<string>();
  for (const offer of offers) {
    if (!isPlanVariant(offer)) continue;
    const variantLabel = offer.variantLabel ?? offer.variant;
    const key = `${offer.variant}:${variantLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({ variant: offer.variant, variantLabel });
  }
  return notes;
}

function streamingByService(
  entries: [string, Offer[]][],
): Map<number, Map<string, Offer[]>> {
  const byService = new Map<number, Map<string, Offer[]>>();
  for (const [country, offers] of entries) {
    for (const offer of offers) {
      if (!isStreaming(offer)) continue;
      const byCountry = byService.get(offer.serviceId) ?? new Map();
      const list = byCountry.get(country) ?? [];
      list.push(offer);
      byCountry.set(country, list);
      byService.set(offer.serviceId, byCountry);
    }
  }
  return byService;
}

function countryTiers(byCountry: Map<string, Offer[]>): CountryTier[] {
  return [...byCountry.entries()]
    .map(([country, offers]) => {
      const tierOnly = offers.every(isPlanVariant);
      const tier: CountryTier = { country, tierOnly };
      if (!tierOnly) return tier;
      const label = offers.find((offer) => offer.variantLabel)?.variantLabel;
      if (label) tier.variantLabel = label;
      return tier;
    })
    .sort((a, b) => compareCountries(a.country, b.country));
}

function byCoverage(
  a: { serviceId: number; countries: CountryTier[] },
  b: { serviceId: number; countries: CountryTier[] },
): number {
  return b.countries.length - a.countries.length || a.serviceId - b.serviceId;
}

function offersByType(offers: Offer[]): OffersByType {
  return {
    stream: offers.filter((offer) => offer.type === "stream"),
    ads: offers.filter((offer) => offer.type === "ads"),
    free: offers.filter((offer) => offer.type === "free"),
    rent: offers.filter((offer) => offer.type === "rent"),
    buy: offers.filter((offer) => offer.type === "buy"),
  };
}

function countryRank(row: CountryRow): number {
  if (row.hasMyService) return 0;
  const streaming =
    row.offersByType.stream.length +
    row.offersByType.ads.length +
    row.offersByType.free.length;
  return streaming > 0 ? 1 : 2;
}

function compareCountries(a: string, b: string): number {
  return regionName(a).localeCompare(regionName(b), "en");
}

function regionName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
