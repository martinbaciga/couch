"use client";

import { useState, type PointerEvent, type ReactNode } from "react";

type TooltipProps = {
  label: string;
  align?: "center" | "end";
  children: ReactNode;
};

/**
 * Labels an icon-only control. Shown on mouse hover and keyboard focus,
 * dismissed with Escape, and not opened by a touch press.
 * The arrow and the box share one outline: the fill covers the border
 * across the arrow's base.
 */
export function Tooltip({ label, align = "center", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const shown = open && !suppressed;

  function onPointerEnter(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType !== "mouse") return;
    setSuppressed(false);
    setOpen(true);
  }

  function onPointerLeave() {
    setSuppressed(false);
    setOpen(false);
  }

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={(event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLElement) ||
          !target.matches(":focus-visible")
        )
          return;
        setSuppressed(false);
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !shown) return;
        event.stopPropagation();
        setOpen(false);
        setSuppressed(true);
      }}
    >
      {children}
      {shown ? (
        <span
          role="tooltip"
          data-align={align}
          className="tooltip px-3 py-1.5 text-caption"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
