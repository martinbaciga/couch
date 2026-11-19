"use client";

import { useState, type KeyboardEvent } from "react";
import { nextActive } from "@/lib/search/query";

export type ComboboxKey = number | "escape";

/**
 * Active option for one combobox. `-1` means nothing is highlighted,
 * so Enter can fall through to the results page.
 */
export function useComboboxNavigation(signature: string, count: number) {
  const [active, setActive] = useState(-1);
  const [tracked, setTracked] = useState(signature);
  if (tracked !== signature) {
    setTracked(signature);
    setActive(-1);
  }

  function onKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ): ComboboxKey | null {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => nextActive(current, count, "down"));
      return null;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => nextActive(current, count, "up"));
      return null;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(nextActive(active, count, "home"));
      return null;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(nextActive(active, count, "end"));
      return null;
    }
    if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      return active;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      return "escape";
    }
    return null;
  }

  return { active, setActive, onKeyDown };
}
