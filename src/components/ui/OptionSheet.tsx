"use client";

import { useId, type KeyboardEvent } from "react";
import { focusRing } from "./styles";
import { useDialog } from "./useDialog";

export type SheetOption = {
  id: string;
  label: string;
  hint: string;
};

type OptionSheetProps = {
  id?: string;
  open: boolean;
  title: string;
  description: string;
  options: readonly SheetOption[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  closeLabel: string;
};

/** A bottom sheet of radio rows. Escape, the scrim, and a choice all close it. */
export function OptionSheet({
  id,
  open,
  title,
  description,
  options,
  selected,
  onSelect,
  onClose,
  closeLabel,
}: OptionSheetProps) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = options.findIndex((option) => option.id === selected);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onSelect(next.id);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 cursor-pointer bg-surface-inverse/50"
        onClick={onClose}
      />
      <div
        id={id}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative flex max-h-dvh w-full flex-col gap-1 overflow-y-auto rounded-panel border border-border-default bg-surface-card px-5 pt-6 pb-8 shadow-toast"
      >
        <h2 id={titleId} className="text-service font-bold text-text-default">
          {title}
        </h2>
        <p id={bodyId} className="text-body font-medium text-text-muted">
          {description}
        </p>
        <div className="h-2" />
        <div role="radiogroup" aria-labelledby={titleId} onKeyDown={onKeyDown}>
          {options.map((option, index) => (
            <div key={option.id}>
              {index > 0 ? <div className="h-px bg-border-subtle" /> : null}
              <button
                type="button"
                role="radio"
                aria-checked={option.id === selected}
                data-autofocus={option.id === selected ? "" : undefined}
                onClick={() => onSelect(option.id)}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 py-3 text-start ${focusRing}`}
              >
                <RadioMark checked={option.id === selected} />
                <span className="min-w-0 flex-1 text-search font-medium text-text-default">
                  {option.label}
                </span>
                <span className="shrink-0 text-search font-medium text-text-muted tabular-nums">
                  {option.hint}
                </span>
              </button>
            </div>
          ))}
          <div className="h-px bg-border-subtle" />
        </div>
      </div>
    </div>
  );
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong"
      aria-hidden="true"
    >
      {checked ? (
        <span className="size-2.5 rounded-full bg-surface-inverse" />
      ) : null}
    </span>
  );
}
