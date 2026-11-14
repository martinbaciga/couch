export type ServiceDefinition = {
  id: number;
  name: string;
  aliases?: string[];
};

export type ProviderOverride = {
  serviceId: number;
  variant?: "ads" | "tier";
  variantLabel?: string;
};

// Parent ids are the main TMDB provider ids seen in the spike.
// Amazon Prime Video uses 119; provider 9 is the same name and is overridden.
export const services: ServiceDefinition[] = [
  { id: 8, name: "Netflix" },
  { id: 337, name: "Disney Plus", aliases: ["Disney+"] },
  { id: 119, name: "Amazon Prime Video" },
  { id: 1899, name: "HBO Max" },
  { id: 531, name: "Paramount Plus", aliases: ["Paramount+"] },
  { id: 350, name: "Apple TV" },
  { id: 15, name: "Hulu" },
  { id: 10, name: "Amazon Video" },
  { id: 2, name: "Apple TV Store" },
  { id: 35, name: "Rakuten TV" },
];

export const providerOverrides: Record<number, ProviderOverride> = {
  9: { serviceId: 119 },
};
