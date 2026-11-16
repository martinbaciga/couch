"use client";

import { useSyncExternalStore } from "react";
import { parseSettings, SETTINGS_KEY, type Settings } from "./settings";

let cachedRaw: string | null | undefined;
let snapshot: Settings | null = null;

function subscribe(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== SETTINGS_KEY && event.key !== null) return;
    cachedRaw = undefined;
    onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getSnapshot(): Settings | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw === cachedRaw) return snapshot;
    cachedRaw = raw;
    snapshot = raw === null ? null : parseSettings(raw);
    return snapshot;
  } catch {
    return snapshot;
  }
}

/**
 * Saved country and services, or null. Same-tab writes land with the settings
 * page (MAR-16); other tabs update through the storage event.
 */
export function useSettings(): Settings | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
