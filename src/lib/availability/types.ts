export type Kind = "movie" | "tv";

export type OfferType = "stream" | "ads" | "free" | "rent" | "buy";

export type Offer = {
  type: OfferType;
  serviceId: number;
  providerId: number;
  variant?: "ads" | "tier" | "channel";
  variantLabel?: string;
};

export type TitleAvailability = {
  countries: Record<string, Offer[]>;
  fetchedAt: string;
};

export type TitleSummary = {
  kind: Kind;
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  posterPath: string | null;
};

export type TitlePage = TitleSummary & {
  runtime: number | null;
  seasons: number | null;
  genres: string[];
  overview: string;
  certifications: Record<string, string>;
  imdbId: string | null;
  trailerKey: string | null;
};
