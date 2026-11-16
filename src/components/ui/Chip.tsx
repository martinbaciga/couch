import type { ReactNode } from "react";
import { focusRing, motionColor } from "./styles";

type ChipProps = {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  count?: string;
  children: ReactNode;
  disabled?: boolean;
};

/**
 * Pill selection. `pressed` is exposed as aria-pressed.
 * Pass `count` already formatted; it uses tabular figures.
 */
export function Chip({
  pressed,
  onPressedChange,
  count,
  children,
  disabled = false,
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-4 py-chip-y text-body disabled:cursor-not-allowed disabled:opacity-40 ${motionColor} ${focusRing} ${
        pressed
          ? "border-surface-inverse bg-surface-inverse text-text-on-inverse hover:bg-primary-800 active:bg-primary-1000"
          : "border-border-default bg-transparent text-text-default hover:bg-primary-200 active:bg-primary-300"
      }`}
    >
      <span className="font-medium">{children}</span>
      {count !== undefined ? (
        <span className={`tabular-nums ${pressed ? "" : "text-text-muted"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
