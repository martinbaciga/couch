"use client";

import { ChevronIcon } from "./icons";

type SelectFieldProps = {
  id?: string;
  value: string;
  expanded: boolean;
  controls: string;
  onClick: () => void;
  className?: string;
  text?: "input" | "body";
};

/**
 * A bordered control that opens a sheet. It is a button, not a native select,
 * so the sheet can be the list.
 */
export function SelectField({
  id,
  value,
  expanded,
  controls,
  onClick,
  className,
  text = "input",
}: SelectFieldProps) {
  const type =
    text === "body" ? "text-body font-medium" : "truncate text-search";

  return (
    <button
      id={id}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`field-focus flex h-13 min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-control border-control border-border-strong bg-surface-field px-4 text-start text-text-default ${className ?? ""}`}
    >
      <span className={`min-w-0 ${type}`}>{value}</span>
      <ChevronIcon className="size-4.5 shrink-0" />
    </button>
  );
}
