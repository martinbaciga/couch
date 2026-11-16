export const SETTINGS_KEY = "couch:settings:v1";

export type Settings = {
  country: string | null;
  serviceIds: number[];
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isServiceIds(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "number" && Number.isInteger(id))
  );
}

/** Returns null when the saved value is missing, corrupt, or the wrong shape. */
export function parseSettings(raw: string): Settings | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (value.country !== null && typeof value.country !== "string")
      return null;
    if (!isServiceIds(value.serviceIds)) return null;
    if (typeof value.updatedAt !== "string") return null;
    return {
      country: value.country,
      serviceIds: value.serviceIds,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

/** Never throws. Storage failures and bad JSON both read as "no settings". */
export function readSettings(
  storage: Pick<Storage, "getItem">,
): Settings | null {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return null;
    return parseSettings(raw);
  } catch {
    return null;
  }
}
