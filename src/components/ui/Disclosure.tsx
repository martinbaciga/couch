"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronIcon } from "./icons";
import { focusRing, motionColor } from "./styles";

type DisclosureProps = {
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

/** Button that shows or hides a section. The expanded state is aria-expanded. */
export function Disclosure({
  label,
  children,
  defaultExpanded = false,
}: DisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-button px-2.5 text-start text-body font-medium text-text-default hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`}
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
        className="pt-2 text-body text-text-default"
      >
        {children}
      </div>
    </div>
  );
}
