import { services } from "@/data/services";
import { resolveProvider } from "@/lib/services/resolve-provider";
import type { CatalogueProvider } from "@/lib/tmdb/types";

export const BASE_SERVICE_LIMIT = 6;

export type ListedService = {
  id: number;
  name: string;
  logoPath: string | null;
  via?: string;
};

type Group = ListedService & {
  displayPriority: number;
};

export function mergeProviderCatalogues(
  lists: CatalogueProvider[][],
): CatalogueProvider[] {
  const byId = new Map<number, CatalogueProvider>();
  for (const provider of lists.flat()) {
    const current = byId.get(provider.providerId);
    if (!current || provider.displayPriority < current.displayPriority) {
      byId.set(provider.providerId, {
        ...provider,
        logoPath: provider.logoPath ?? current?.logoPath ?? null,
      });
    } else if (!current.logoPath && provider.logoPath) {
      byId.set(provider.providerId, {
        ...current,
        logoPath: provider.logoPath,
      });
    }
  }
  return [...byId.values()];
}

export function listCountryServices(providers: CatalogueProvider[]): {
  services: ListedService[];
  catalogue: ListedService[];
} {
  const groups = new Map<number, Group>();

  for (const provider of providers) {
    const resolved = resolveProvider(
      provider.providerId,
      provider.providerName,
    );
    const id = resolved.serviceId;
    const current = groups.get(id);
    const known = services.find((service) => service.id === id);
    const name = known?.name ?? provider.providerName.trim();
    const isParent = provider.providerId === id;

    if (!current) {
      groups.set(id, {
        id,
        name,
        logoPath: provider.logoPath,
        ...(resolved.via ? { via: resolved.via } : {}),
        displayPriority: provider.displayPriority,
      });
      continue;
    }

    if (provider.displayPriority < current.displayPriority) {
      current.displayPriority = provider.displayPriority;
    }
    if (isParent) current.name = name;
    if ((isParent || !current.logoPath) && provider.logoPath) {
      current.logoPath = provider.logoPath;
    }
  }

  const catalogue = [...groups.values()].sort(byPriority).map(toListedService);
  const servicesForSetup = catalogue
    .filter((service) => !service.via)
    .slice(0, BASE_SERVICE_LIMIT);

  return { services: servicesForSetup, catalogue };
}

function byPriority(left: Group, right: Group): number {
  return (
    left.displayPriority - right.displayPriority ||
    left.name.localeCompare(right.name, "en")
  );
}

function toListedService(group: Group): ListedService {
  return {
    id: group.id,
    name: group.name,
    logoPath: group.logoPath,
    ...(group.via ? { via: group.via } : {}),
  };
}
