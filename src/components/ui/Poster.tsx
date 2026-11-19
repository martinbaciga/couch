type PosterProps = {
  src?: string | null;
  alt: string;
  /** Small search-row frame: 4px radius and a hairline border. */
  framed?: boolean;
  className?: string;
};

/**
 * Title artwork at poster ratio. When `src` is missing, the alt text
 * is shown in the frame so the gap is not colour alone.
 * Pass className for the width.
 */
export function Poster({ src, alt, framed = false, className }: PosterProps) {
  const shape = framed
    ? "rounded-sm border border-border-subtle"
    : "rounded-xl";
  const frame = `aspect-poster overflow-hidden bg-primary-200 ${shape} ${className ?? "w-24"}`;

  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${frame} flex items-center justify-center p-3 text-center`}
      >
        <span className="font-display text-body text-text-muted">{alt}</span>
      </div>
    );
  }

  return (
    // Poster URLs come from TMDB and are not part of the local image set.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`${frame} object-cover`} />
  );
}
