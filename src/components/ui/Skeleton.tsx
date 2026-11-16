/**
 * Soft pulse placeholder. Omit className for the default 240×14 bar.
 * Pass a height and width utility when standing in for a known space.
 * The pulse stops under prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className ?? "h-3.5 w-60"}`}
    />
  );
}
