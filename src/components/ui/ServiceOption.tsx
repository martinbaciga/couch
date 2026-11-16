"use client";

import { CheckIcon } from "./icons";
import { ServiceLogo } from "./ServiceLogo";
import { focusRing } from "./styles";

type ServiceOptionProps = {
  name: string;
  src?: string | null;
  selected: boolean;
  onToggle: () => void;
};

/** A service row. The whole row is the checkbox. */
export function ServiceOption({
  name,
  src,
  selected,
  onToggle,
}: ServiceOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex min-h-14 w-full cursor-pointer items-center gap-2 rounded-md bg-surface-card ps-2.5 pe-2 text-start sm:gap-3 sm:px-3.5 ${focusRing} ${
        selected
          ? "border-2 border-border-strong"
          : "border border-border-subtle"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-sm ${
          selected
            ? "bg-surface-inverse text-text-on-inverse"
            : "border-control border-border-strong bg-surface-field"
        }`}
      >
        {selected ? <CheckIcon className="size-3" /> : null}
      </span>
      <ServiceLogo name={name} src={src} size="small" decorative />
      <span
        className={`min-w-0 ${selected ? "text-body font-medium sm:text-ui" : "text-body"}`}
      >
        {name}
      </span>
    </button>
  );
}
