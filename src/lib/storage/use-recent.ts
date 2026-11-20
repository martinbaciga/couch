"use client";

import { useSyncExternalStore } from "react";
import {
  clearRecent,
  isRecentMemory,
  parseRecent,
  readRecent,
  RECENT_KEY,
  rememberRecent,
  removeRecent,
  type RecentTitle,
} from "./recent";

let cachedRaw: string | null | undefined;
let snapshot: RecentTitle[] = [];
// A new array on every call makes React treat the server snapshot as changed.
const serverSnapshot: RecentTitle[] = [];
const listeners = new Set<() => void>();

function emit() {
  cachedRaw = undefined;
  for (const listener of listeners) listener();
  window.dispatchEvent(new Event("couch-storage"));
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  function onStorage(event: StorageEvent) {
    if (event.key !== RECENT_KEY && event.key !== null) return;
    cachedRaw = undefined;
    onStoreChange();
  }

  function onCouch() {
    cachedRaw = undefined;
    onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener("couch-storage", onCouch);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("couch-storage", onCouch);
  };
}

function getSnapshot(): RecentTitle[] {
  try {
    if (isRecentMemory()) {
      const next = readRecent(window.localStorage);
      if (next !== snapshot) snapshot = next;
      return snapshot;
    }
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw === cachedRaw) return snapshot;
    cachedRaw = raw;
    snapshot = raw === null ? [] : parseRecent(raw);
    return snapshot;
  } catch {
    const next = readRecent(window.localStorage);
    if (next !== snapshot) snapshot = next;
    return snapshot;
  }
}

/** Up to five titles opened on this device, newest first. */
export function useRecentlyViewed(): RecentTitle[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function rememberViewed(title: RecentTitle): void {
  rememberRecent(window.localStorage, title);
  emit();
}

export function removeViewed(kind: RecentTitle["kind"], id: number): void {
  removeRecent(window.localStorage, kind, id);
  emit();
}

export function clearViewed(): void {
  clearRecent(window.localStorage);
  emit();
}
