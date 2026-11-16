import type { ReactNode } from "react";

/**
 * White field with the default border, for a block of related content.
 * Pass className for layout only.
 */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-border-default bg-surface-field p-4 text-text-default ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
