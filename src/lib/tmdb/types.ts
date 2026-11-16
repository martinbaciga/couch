export type MediaKind = "movie" | "tv";

export type SearchHit = {
  id: number;
  kind: MediaKind;
  title: string;
  originalTitle: string;
  year: number | null;
  posterPath: string | null;
};

export type SearchPage = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchHit[];
};

export type Genre = {
  id: number;
  name: string;
};

export type TitleDetails = {
  id: number;
  kind: MediaKind;
  title: string;
  originalTitle: string;
  year: number | null;
  posterPath: string | null;
  overview: string;
  genres: Genre[];
  runtimeMinutes: number | null;
  numberOfSeasons: number | null;
  ageRatings: Record<string, string>;
  imdbId: string | null;
  trailerKey: string | null;
};

export type WatchProvider = {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  displayPriority: number;
};

export type CountryOffers = {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
  free?: WatchProvider[];
};

export type WatchProviders = {
  id: number;
  results: Record<string, CountryOffers>;
  fetchedAt: string;
};

export type Region = {
  code: string;
  englishName: string;
  nativeName: string;
};

export type CatalogueProvider = WatchProvider;
