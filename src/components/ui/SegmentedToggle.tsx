"use client";

import { useRef } from "react";
import { focusRing, motionColor } from "./styles";

type Segment = "service" | "country";

type SegmentedToggleProps = {
  label: string;
  value: Segment;
  onValueChange: (value: Segment) => void;
  serviceLabel: string;
  countryLabel: string;
};

/**
 * The by-service / by-country choice. One option is selected.
 * Arrow keys move the selection. `label` names the group for assistive tech.
 */
export function SegmentedToggle({
  label,
  value,
  onValueChange,
  serviceLabel,
  countryLabel,
}: SegmentedToggleProps) {
  const options: { value: Segment; label: string }[] = [
    { value: "service", label: serviceLabel },
    { value: "country", label: countryLabel },
  ];
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function select(index: number) {
    const next = options[index];
    if (!next) return;
    onValueChange(next.value);
    buttons.current[index]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex h-toggle w-full max-w-toggle overflow-hidden rounded-control border-control border-border-strong"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`flex flex-1 cursor-pointer items-center justify-center text-ui font-medium ${motionColor} ${focusRing} ${
              selected
                ? "bg-surface-inverse text-text-on-inverse"
                : "bg-transparent text-text-default hover:bg-primary-200 active:bg-primary-300"
            }`}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                select((index + 1) % options.length);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                select((index - 1 + options.length) % options.length);
              } else if (event.key === "Home") {
                event.preventDefault();
                select(0);
              } else if (event.key === "End") {
                event.preventDefault();
                select(options.length - 1);
              }
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
