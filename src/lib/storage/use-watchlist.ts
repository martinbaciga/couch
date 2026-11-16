"use client";

import { useSyncExternalStore } from "react";
import {
  parseWatchlistSummary,
  WATCHLIST_KEY,
  type WatchlistSummary,
} from "./watchlist";

let cachedRaw: string | null | undefined;
let snapshot: WatchlistSummary | null = null;

function subscribe(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== WATCHLIST_KEY && event.key !== null) return;
    cachedRaw = undefined;
    onStoreChange();
  }
  function onLocal() {
    cachedRaw = undefined;
    onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("couch-storage", onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("couch-storage", onLocal);
  };
}

function getSnapshot(): WatchlistSummary | null {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (raw === cachedRaw) return snapshot;
    cachedRaw = raw;
    snapshot = raw === null ? null : parseWatchlistSummary(raw);
    return snapshot;
  } catch {
    return snapshot;
  }
}

/** The saved watchlist, or null. Updates in this tab and in others. */
export function useWatchlist(): WatchlistSummary | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
