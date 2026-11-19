"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SearchDialog } from "@/components/shell/SearchDialog";
import { createSearchContext, SearchContext } from "./search-context";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  // `?search=1` opens the dialog from a link. The param is removed so Back
  // closes the dialog's own history entry rather than the link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") !== "1") return;
    params.delete("search");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ?search=1 is only known after hydration
    setOpen(true);
  }, []);

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
