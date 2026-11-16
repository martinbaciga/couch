/** Regional-indicator glyph in a circle. Decorative: the country name is the label. */
export function Flag({ code }: { code: string }) {
  const upper = code.toUpperCase();
  const emoji = /^[A-Z]{2}$/.test(upper)
    ? String.fromCodePoint(
        ...upper.split("").map((char) => 127397 + char.charCodeAt(0)),
      )
    : "";

  return (
    <span
      aria-hidden="true"
      className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-primary-200 text-small leading-none"
    >
      {emoji}
    </span>
  );
}
