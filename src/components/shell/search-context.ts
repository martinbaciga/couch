"use client";

import { createContext, use } from "react";

type SearchContextValue = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

export const SearchContext = createContext<SearchContextValue | null>(null);

export function createSearchContext(
  open: boolean,
  openSearch: () => void,
  closeSearch: () => void,
): SearchContextValue {
  return { open, openSearch, closeSearch };
}

export function useSearch(): SearchContextValue {
  const value = use(SearchContext);
  if (!value) throw new Error("SearchProvider is missing");
  return value;
}
