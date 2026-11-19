"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SearchDialog } from "@/components/shell/SearchDialog";
import { createSearchContext, SearchContext } from "./search-context";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");
      const slash =
        event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const palette =
        event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (slash && !typing) {
        event.preventDefault();
        setOpen(true);
      } else if (palette) {
        event.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SearchContext.Provider
      value={createSearchContext(open, openSearch, closeSearch)}
    >
      {children}
      <SearchDialog open={open} onClose={closeSearch} />
    </SearchContext.Provider>
  );
}
