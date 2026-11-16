import {
  providerOverrides,
  services,
  type ProviderOverride,
} from "@/data/services";

export type ResolvedProvider = ProviderOverride & {
  via?: string;
};

const CHANNELS: ReadonlyArray<{ pattern: RegExp; via: string }> = [
  { pattern: /amazon channel$/, via: "Amazon" },
  { pattern: /apple tv channel$/, via: "Apple TV" },
  { pattern: /roku premium channel$/, via: "Roku" },
];

const SUFFIXES: ReadonlyArray<{
  suffix: string;
  variant: "ads" | "tier";
  variantLabel: string;
}> = [
  { suffix: " standard with ads", variant: "ads", variantLabel: "with ads" },
  { suffix: " basic with ads", variant: "ads", variantLabel: "with ads" },
  { suffix: " with ads", variant: "ads", variantLabel: "with ads" },
  { suffix: " premium", variant: "tier", variantLabel: "Premium" },
];

export function resolveProvider(
  providerId: number,
  providerName: string,
): ResolvedProvider {
  const override = providerOverrides[providerId];
  if (override) return override;

  const name = normaliseName(providerName);
  const channel = CHANNELS.find((entry) => entry.pattern.test(name));
  if (channel) return { serviceId: providerId, via: channel.via };

  const exact = findService(name);
  if (exact) return { serviceId: exact.id };

  for (const rule of SUFFIXES) {
    if (!name.endsWith(rule.suffix)) continue;
    const parent = findService(name.slice(0, -rule.suffix.length));
    if (!parent) break;
    return {
      serviceId: parent.id,
      variant: rule.variant,
      variantLabel: rule.variantLabel,
    };
  }

  return { serviceId: providerId };
}

function findService(name: string) {
  return services.find(
    (service) =>
      normaliseName(service.name) === name ||
      service.aliases?.some((alias) => normaliseName(alias) === name),
  );
}

function normaliseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
