import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function Svg({
  className,
  viewBox,
  children,
}: {
  className?: string;
  viewBox: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      className={className ?? "size-full"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Download mark from the header and secondary button. */
export function ImportIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 20 20">
      <path
        d="M10 2.5V12.5M13.75 8.75L10 12.5L6.25 8.75M3.125 13.125V15.625C3.125 16.1223 3.32254 16.5992 3.67417 16.9508C4.02581 17.3025 4.50272 17.5 5 17.5H15C15.4973 17.5 15.9742 17.3025 16.3258 16.9508C16.6775 16.5992 16.875 16.1223 16.875 15.625V13.125"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Search mark from the header. */
export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 16 16">
      <path
        d="M9.7 9.7L13.5 13.5M11 6.5C11 8.9853 8.9853 11 6.5 11C4.0147 11 2 8.9853 2 6.5C2 4.0147 4.0147 2 6.5 2C8.9853 2 11 4.0147 11 6.5Z"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Gear from the header. */
export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 16.925 16.925">
      <path
        d="M13.9425 6.52375L16.175 7.2175V9.7075L13.9425 10.4012L13.7075 10.9663L14.7963 13.0363L13.0363 14.7963L10.9663 13.7075L10.4012 13.9425L9.7075 16.175H7.2175L6.52375 13.9425L5.95875 13.7075L3.88875 14.7963L2.12875 13.0363L3.2175 10.9663L2.9825 10.4012L0.75 9.7075V7.2175L2.9825 6.52375L3.2175 5.95875L2.12875 3.88875L3.88875 2.12875L5.95875 3.2175L6.52375 2.9825L7.2175 0.75H9.7075L10.4012 2.9825L10.9663 3.2175L13.0363 2.12875L14.7963 3.88875L13.7075 5.95875L13.9425 6.52375Z"
        strokeWidth="1.5"
        {...stroke}
      />
      <path
        d="M11.0875 8.4625C11.0875 9.91225 9.91226 11.0875 8.46251 11.0875C7.01276 11.0875 5.83751 9.91225 5.83751 8.4625C5.83751 7.01275 7.01276 5.8375 8.46251 5.8375C9.91226 5.8375 11.0875 7.01275 11.0875 8.4625Z"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Check from the toast. */
export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 16 16">
      <path d="M2 8.5L6 12.5L14 4" strokeWidth="2" {...stroke} />
    </Svg>
  );
}

/** Close mark for the search dialog. */
export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 20 20">
      <path d="M5 5L15 15M15 5L5 15" strokeWidth="1.5" {...stroke} />
    </Svg>
  );
}

/** Film mark beside the year on a title page. */
export function FilmIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 16 16">
      <path
        d="M5 2V14M11 2V14M2 6H5M2 10H5M11 6H14M11 10H14M5 8H11M3.5 2H12.5C13.3284 2 14 2.6716 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.6716 14 2 13.3284 2 12.5V3.5C2 2.6716 2.6716 2 3.5 2Z"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Television mark beside the year on a series title page. */
export function SeriesIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 16 16">
      <path
        d="M5 1.5L8 4.5L11 1.5M3.5 4.5H12.5C13.3284 4.5 14 5.1716 14 6V12C14 12.8284 13.3284 13.5 12.5 13.5H3.5C2.6716 13.5 2 12.8284 2 12V6C2 5.1716 2.6716 4.5 3.5 4.5Z"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Stacked sheets for Copy link. */
export function CopyIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 12 12">
      <path
        d="M8.25 4.125V2.625C8.25 2.0037 7.7463 1.5 7.125 1.5H2.625C2.0037 1.5 1.5 2.0037 1.5 2.625V7.125C1.5 7.7463 2.0037 8.25 2.625 8.25H4.125M5.25 4.125H9.375C9.9963 4.125 10.5 4.6287 10.5 5.25V9.375C10.5 9.9963 9.9963 10.5 9.375 10.5H5.25C4.6287 10.5 4.125 9.9963 4.125 9.375V5.25C4.125 4.6287 4.6287 4.125 5.25 4.125Z"
        strokeWidth="1.5"
        {...stroke}
      />
    </Svg>
  );
}

/** Letterboxd mark from Simple Icons (CC0), filled with the chip colour. */
export function LetterboxdIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "size-full"}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8.224 14.352a4.447 4.447 0 0 1-3.775 2.092C1.992 16.444 0 14.454 0 12s1.992-4.444 4.45-4.444c1.592 0 2.988.836 3.774 2.092-.427.682-.673 1.488-.673 2.352s.246 1.67.673 2.352zM15.101 12c0-.864.247-1.67.674-2.352-.786-1.256-2.183-2.092-3.775-2.092s-2.989.836-3.775 2.092c.427.682.674 1.488.674 2.352s-.247 1.67-.674 2.352c.786 1.256 2.183 2.092 3.775 2.092s2.989-.836 3.775-2.092A4.42 4.42 0 0 1 15.1 12zm4.45-4.444a4.447 4.447 0 0 0-3.775 2.092c.427.682.673 1.488.673 2.352s-.246 1.67-.673 2.352a4.447 4.447 0 0 0 3.775 2.092C22.008 16.444 24 14.454 24 12s-1.992-4.444-4.45-4.444z"
      />
    </svg>
  );
}

/**
 * IMDb wordmark cut out of a rounded square. The path is the owner's
 * file as traced in Figma, filled with the chip colour.
 */
export function ImdbIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.52 7.48667L12.4267 7.56L12.4067 7.66667L12.3933 9.31333L12.4267 9.63333L12.48 9.7L12.5933 9.72667L12.7733 9.64667L12.8 9.46667L12.8133 7.96667L12.7733 7.57333L12.68 7.5L12.52 7.48667ZM9.22667 6.38667L9.18667 6.40667V9.52L9.26 9.53333L9.42667 9.48667L9.5 9.42667L9.55333 9.22667L9.57333 6.94L9.53333 6.51333L9.42667 6.41333L9.22667 6.38667ZM0.346667 0.18L0.133333 0.406667L0 0.773333V15.2067L0.0533333 15.4133L0.186667 15.6533L0.48 15.8933L0.78 15.9867H15.2067L15.4133 15.94L15.6533 15.8L15.8933 15.5133L15.9867 15.2067V0.78L15.94 0.573333L15.8133 0.346667L15.5133 0.0933333L15.2067 0H0.773333L0.573333 0.0533333L0.346667 0.18ZM11.22 5.56H12.3667L12.3933 5.59333V7.08L12.6333 6.90667L12.8133 6.82L13.0133 6.78H13.3467L13.5333 6.82L13.7067 6.90667L13.8333 7.01333L13.96 7.2L14 7.32L14.02 7.79333L14 9.72L13.96 9.92667L13.8667 10.1067L13.5933 10.3333L13.3667 10.4133H12.96L12.7067 10.3333L12.3867 10.08L12.3333 10.32L12.26 10.3733H11.2267L11.1867 10.3467V5.59333L11.22 5.56ZM7.96 5.56H9.28L9.92667 5.61333L10.2067 5.7L10.3667 5.78L10.5 5.89333L10.6533 6.11333L10.74 6.39333L10.7733 6.90667L10.7467 9.58667L10.7067 9.81333L10.6267 10L10.4667 10.1667L10.3333 10.2533L10.1133 10.32L9.77333 10.3667L7.98 10.3733L7.92667 10.3333V5.59333L7.96 5.56ZM3.68 5.56L5.27333 5.58667L5.59333 7.72L5.87333 5.58667L7.48 5.56L7.51333 5.59333L7.48667 10.3667L6.48 10.3733L6.41333 10.3467L6.39333 7.32L5.98667 10.3467L5.92667 10.3733H5.22667L5.2 10.3467L4.76 7.35333L4.74667 10.3333L4.70667 10.3733H3.68667L3.64667 10.3467V5.59333L3.68 5.56ZM2 5.56H3.2L3.22667 5.59333V10.3333L3.18 10.3733H2.02L1.96667 10.3333V5.59333L2 5.56Z"
      />
    </svg>
  );
}

/** YouTube play mark from Simple Icons (CC0), filled with the chip colour. */
export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "size-full"}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}

/** Chevron for a disclosure. Points down, rotate when open. */
export function ChevronIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 20 20">
      <path d="M5 8L10 13L15 8" strokeWidth="1.5" {...stroke} />
    </Svg>
  );
}
