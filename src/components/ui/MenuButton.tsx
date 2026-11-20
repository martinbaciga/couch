"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CheckIcon, ChevronIcon } from "./icons";
import { focusRing } from "./styles";

export type MenuOption = {
  id: string;
  label: string;
  hint: string;
};

type MenuButtonProps = {
  label: string;
  options: readonly MenuOption[];
  selected: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
};

/** Text control with a small menu underneath. The current option is checked. */
export function MenuButton({
  label,
  options,
  selected,
  open,
  onOpenChange,
  onSelect,
}: MenuButtonProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-body font-medium text-text-default ${focusRing}`}
      >
        {label}
        <ChevronIcon className="size-5 shrink-0" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 flex w-60 flex-col gap-0.5 rounded-md border border-border-default bg-surface-card p-1.5 shadow-toast"
        >
          {options.map((option) => (
            <MenuRow
              key={option.id}
              option={option}
              selected={option.id === selected}
              onSelect={() => onSelect(option.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  option,
  selected,
  onSelect,
}: {
  option: MenuOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-button p-2.5 text-start ${
        selected ? "bg-primary-200" : "hover:bg-primary-200"
      } ${focusRing}`}
    >
      <CheckSlot>
        {selected ? <CheckIcon className="size-4" /> : null}
      </CheckSlot>
      <span className="min-w-0 flex-1 text-ui text-text-default">
        {option.label}
      </span>
      <span className="shrink-0 text-caption text-text-muted">
        {option.hint}
      </span>
    </button>
  );
}

function CheckSlot({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      {children}
    </span>
  );
}
