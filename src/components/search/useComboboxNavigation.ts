"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { highlightAfterRemoval, nextActive } from "@/lib/search/query";

export type ComboboxKey = number | "escape";

/**
 * Active option for one combobox. `-1` means nothing is highlighted,
 * so Enter can fall through to the results page. The keyboard flag is
 * set by the arrow keys and cleared on pointer movement, which is the
 * only time a row shows its Enter hint.
 */
export function useComboboxNavigation(signature: string, count: number) {
  const [active, setActive] = useState(-1);
  const [keyboard, setKeyboard] = useState(false);
  const [tracked, setTracked] = useState(signature);

  if (tracked !== signature) {
    const next = highlightAfterRemoval(tracked, signature, active);
    setTracked(signature);
    setActive(next);
    setKeyboard(next >= 0);
  }

  useEffect(() => {
    if (!keyboard) return;
    function onPointerMove(event: PointerEvent) {
      // A list scroll under a still pointer also fires this, with no movement.
      // That must not drop the highlight, or arrowing past the fold stops.
      if (event.movementX === 0 && event.movementY === 0) return;
      setKeyboard(false);
      setActive(-1);
    }
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [keyboard]);

  function onKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ): ComboboxKey | null {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      event.preventDefault();
      const move =
        event.key === "ArrowDown"
          ? "down"
          : event.key === "ArrowUp"
            ? "up"
            : event.key === "Home"
              ? "home"
              : "end";
      setActive((current) => nextActive(current, count, move));
      setKeyboard(count > 0);
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

  return { active, keyboard, onKeyDown };
}
