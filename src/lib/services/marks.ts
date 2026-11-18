import { services } from "@/data/services";
import { resolveProvider } from "@/lib/services/resolve-provider";
import type { CountryOffers, WatchProviders } from "@/lib/tmdb/types";

export type ServiceMark = {
  id: number;
  name: string;
  logoPath: string | null;
};

const BUCKETS = ["flatrate", "ads", "free", "rent", "buy"] as const;

/**
 * One mark per service on a title, so the page can show a name and logo
 * without keeping them on every offer. The parent provider wins the name
 * and the logo. Order is display priority, then name.
 */
export function listServiceMarks(raw: WatchProviders): ServiceMark[] {
  const marks = new Map<number, ServiceMark & { priority: number }>();

  for (const country of Object.values(raw.results)) {
    for (const provider of providersIn(country)) {
      const resolved = resolveProvider(
        provider.providerId,
        provider.providerName,
      );
      const id = resolved.serviceId;
      const known = services.find((service) => service.id === id);
      const name = known?.name ?? provider.providerName.trim();
      const parent = provider.providerId === id;
      const current = marks.get(id);

      if (!current) {
        marks.set(id, {
          id,
          name,
          logoPath: provider.logoPath,
          priority: provider.displayPriority,
        });
        continue;
      }

      if (parent) current.name = name;
      if ((parent || !current.logoPath) && provider.logoPath) {
        current.logoPath = provider.logoPath;
      }
      if (provider.displayPriority < current.priority) {
        current.priority = provider.displayPriority;
      }
    }
  }

  return [...marks.values()]
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.name.localeCompare(right.name, "en") ||
        left.id - right.id,
    )
    .map(({ id, name, logoPath }) => ({ id, name, logoPath }));
}

function providersIn(country: CountryOffers) {
  return BUCKETS.flatMap((bucket) => country[bucket] ?? []);
}
