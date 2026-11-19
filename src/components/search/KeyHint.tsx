/**
 * Desktop key label. Hidden below `md`, the same split as Cancel in the modal.
 */
export function KeyHint({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="hidden shrink-0 rounded-md border border-border-subtle px-2 py-0.5 text-small font-medium text-primary-800 md:inline"
    >
      {label}
    </span>
  );
}
