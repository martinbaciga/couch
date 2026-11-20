"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronIcon } from "./icons";
import { focusRing, motionColor } from "./styles";

type DisclosureProps = {
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** `card` is the bordered row on the watchlist. `plain` is the text toggle. */
  variant?: "plain" | "card";
};

/** Button that shows or hides a section. The expanded state is aria-expanded. */
export function Disclosure({
  label,
  children,
  defaultExpanded = false,
  variant = "plain",
}: DisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const card = variant === "card";

  return (
    <div
      className={
        card
          ? "rounded-xl border border-border-subtle bg-surface-card"
          : undefined
      }
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 text-start font-medium text-text-default ${motionColor} ${focusRing} ${
          card
            ? "rounded-xl p-4 text-ui hover:bg-primary-200 active:bg-primary-300"
            : "rounded-button px-2.5 text-body hover:bg-primary-200 active:bg-primary-300"
        }`}
      >
        {label}
        <span
          className={`size-5 shrink-0 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <ChevronIcon />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!expanded}
        className={
          card
            ? "flex flex-col gap-2 px-4 pb-4 text-body text-text-default"
            : "pt-2 text-body text-text-default"
        }
      >
        {children}
      </div>
    </div>
  );
}
