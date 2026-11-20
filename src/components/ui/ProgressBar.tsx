"use client";

import { useId } from "react";

type ProgressBarProps = {
  label: string;
  valueText: string;
  value: number;
  max: number;
};

/** A labelled bar. The fill width is the only inline style, because it follows the count. */
export function ProgressBar({
  label,
  valueText,
  value,
  max,
}: ProgressBarProps) {
  const labelId = useId();
  const safeMax = max > 0 ? max : 0;
  const current = Math.min(Math.max(value, 0), safeMax);
  const percent = safeMax === 0 ? 0 : (current / safeMax) * 100;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p id={labelId} className="text-body font-medium text-text-default">
          {label}
        </p>
        <p className="text-body text-text-muted">{valueText}</p>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={current}
        aria-valuetext={valueText}
        className="h-1.5 overflow-hidden rounded-pill bg-surface-field"
      >
        <div
          className="h-full rounded-pill bg-surface-inverse"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
