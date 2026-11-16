"use client";

import { useSyncExternalStore } from "react";
import {
  clearCouchData,
  parseSettings,
  readSettings,
  SETTINGS_KEY,
  settingsFromMemory,
  writeSettings,
  type Settings,
} from "./settings";

let cachedRaw: string | null | undefined;
let snapshot: Settings | null = null;
const listeners = new Set<() => void>();

function emit() {
  cachedRaw = undefined;
  for (const listener of listeners) listener();
  window.dispatchEvent(new Event("couch-storage"));
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  function onStorage(event: StorageEvent) {
    if (event.key !== SETTINGS_KEY && event.key !== null) return;
    cachedRaw = undefined;
    onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Settings | null {
  if (settingsFromMemory()) return readSettings(window.localStorage);
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

/** Saved country and services, or null. Updates in this tab and in others. */
export function useSettings(): Settings | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function saveSettings(settings: Settings): void {
  writeSettings(window.localStorage, settings);
  emit();
}

export function clearDeviceData(): void {
  clearCouchData(window.localStorage);
  emit();
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The session copy of settings is handled by clearDeviceData.
  }
  emit();
}
