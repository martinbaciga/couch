import type { ReactNode } from "react";
import Link from "next/link";
import { Tooltip } from "./Tooltip";
import { focusRing, motionColor } from "./styles";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  /** Visible label on a small screen when it is shorter than `label`. */
  shortLabel?: string;
  /**
   * Accessible name when it is not the visible label. The short label stays
   * visual only.
   */
  accessibleName?: string;
  iconOnly?: boolean;
  tooltipAlign?: "center" | "end";
  href?: string;
  /** Marks the item for the page already on screen. */
  current?: boolean;
  onClick?: () => void;
};

const textClass = `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-button px-2.5 text-body font-medium text-text-default hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`;
const iconClass = `inline-flex size-11 cursor-pointer items-center justify-center rounded-button text-text-default hover:bg-primary-200 active:bg-primary-300 ${motionColor} ${focusRing}`;

/**
 * Plain navigation: text and an icon, or an icon alone.
 * Icon-only items show a tooltip with the accessible name.
 * Actions that submit or confirm use Button instead.
 */
export function NavItem({
  icon,
  label,
  shortLabel,
  accessibleName,
  iconOnly = false,
  tooltipAlign = "center",
  href,
  current = false,
  onClick,
}: NavItemProps) {
  const className = iconOnly ? iconClass : textClass;
  const ariaLabel =
    accessibleName || iconOnly || shortLabel
      ? (accessibleName ?? label)
      : undefined;
  const content = (
    <>
      <span className="size-5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      {iconOnly ? null : shortLabel ? (
        <>
          <span className="md:hidden">{shortLabel}</span>
          <span className="hidden md:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </>
  );

  const control = href ? (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-current={current ? "page" : undefined}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {content}
    </button>
  );

  if (!iconOnly) return control;

  return (
    <Tooltip label={label} align={tooltipAlign}>
      {control}
    </Tooltip>
  );
}
