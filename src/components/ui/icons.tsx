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

/** Chevron for a disclosure. Points down, rotate when open. */
export function ChevronIcon({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 20 20">
      <path d="M5 8L10 13L15 8" strokeWidth="1.5" {...stroke} />
    </Svg>
  );
}
