"use client";

import { useSyncExternalStore } from "react";
import {
  parseSavedWatchlist,
  parseWatchlistSummary,
  WATCHLIST_KEY,
  writeWatchlistSummary,
  type CategoryCounts,
  type SavedWatchlist,
  type WatchlistSummary,
} from "./watchlist";

let cachedRaw: string | null | undefined;
let snapshot: WatchlistSummary | null = null;
let cachedListRaw: string | null | undefined;
let listSnapshot: SavedWatchlist | null = null;

function subscribe(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== WATCHLIST_KEY && event.key !== null) return;
    cachedRaw = undefined;
    cachedListRaw = undefined;
    onStoreChange();
  }
  function onLocal() {
    cachedRaw = undefined;
    cachedListRaw = undefined;
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

function getListSnapshot(): SavedWatchlist | null {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (raw === cachedListRaw) return listSnapshot;
    cachedListRaw = raw;
    listSnapshot = raw === null ? null : parseSavedWatchlist(raw);
    return listSnapshot;
  } catch {
    return listSnapshot;
  }
}

/** Matches and the file rows. Availability is loaded again on the page. */
export function useSavedWatchlist(): SavedWatchlist | null {
  return useSyncExternalStore(subscribe, getListSnapshot, () => null);
}

/** Stores the landing counts. The entries themselves are left alone. */
export function saveWatchlistSummary(
  counts: CategoryCounts,
  computedAt: string,
): void {
  writeWatchlistSummary(window.localStorage, counts, computedAt);
  cachedRaw = undefined;
  cachedListRaw = undefined;
  window.dispatchEvent(new Event("couch-storage"));
}
