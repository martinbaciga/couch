type ServiceLogoProps = {
  name: string;
  src?: string | null;
  size?: "default" | "small";
  marker?: "none" | "mine" | "plan";
  /** The name is already next to the mark, so the image is not announced. */
  decorative?: boolean;
};

const frames = {
  default: "size-10 rounded-md",
  small: "size-7 rounded-sm",
} as const;

const markers = {
  none: "border border-border-subtle",
  mine: "border-2 border-solid border-border-strong",
  plan: "border-2 border-dashed border-border-strong",
} as const;

/**
 * Square service mark. A solid outline means the service is one of yours.
 * A dashed outline means the title is only on a specific plan.
 * Without an image, the first letter of `name` is the placeholder.
 */
export function ServiceLogo({
  name,
  src,
  size = "default",
  marker = "none",
  decorative = false,
}: ServiceLogoProps) {
  const letter = Array.from(name)[0]?.toLocaleUpperCase() ?? "";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-primary-200 text-text-muted ${frames[size]} ${markers[marker]}`}
    >
      {src ? (
        // The supplied logo file is a bitmap or SVG URL from the catalogue.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={decorative ? "" : name}
          className="size-full object-contain"
        />
      ) : (
        <span
          className={
            size === "small" ? "text-small font-medium" : "logo-letter"
          }
          aria-hidden="true"
        >
          {letter}
        </span>
      )}
      {src || decorative ? null : <span className="sr-only">{name}</span>}
    </span>
  );
}
