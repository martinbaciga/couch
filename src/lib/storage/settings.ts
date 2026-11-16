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
    if ("version" in value && value.version !== 1) return null;
    return {
      country: value.country,
      serviceIds: value.serviceIds,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key"
> & {
  readonly length: number;
};

let memory: Settings | null = null;
let usingMemory = false;

/** Test isolation. The in-memory fallback survives a thrown storage. */
export function resetSettingsStore(): void {
  memory = null;
  usingMemory = false;
}

export function settingsFromMemory(): boolean {
  return usingMemory;
}

/** Never throws. Storage failures and bad JSON both read as "no settings". */
export function readSettings(
  storage: Pick<Storage, "getItem">,
): Settings | null {
  if (usingMemory) return memory;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return null;
    return parseSettings(raw);
  } catch {
    return null;
  }
}

/** Writes the v1 object. If storage throws, the value is kept for this session. */
export function writeSettings(
  storage: Pick<Storage, "setItem">,
  settings: Settings,
): void {
  const next = {
    country: settings.country,
    serviceIds: [...settings.serviceIds],
    updatedAt: settings.updatedAt,
  };
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    usingMemory = false;
    memory = null;
  } catch {
    memory = next;
    usingMemory = true;
  }
}

/** Deletes every `couch:` key. A thrown storage still clears the session copy. */
export function clearCouchData(storage: StorageLike): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith("couch:")) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
    usingMemory = false;
    memory = null;
  } catch {
    memory = null;
    usingMemory = true;
  }
}
