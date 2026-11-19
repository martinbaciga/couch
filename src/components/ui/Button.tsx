import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { focusRing, motionColor } from "./styles";

type ButtonProps = {
  variant?: "primary" | "secondary";
  /** Light fill for a primary action sitting on the dark home card. */
  tone?: "default" | "inverse";
  size?: "default" | "small";
  icon?: ReactNode;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants = {
  primary:
    "border border-transparent bg-primary-900 font-medium text-text-on-inverse hover:bg-primary-800 active:bg-primary-1000",
  secondary:
    "border border-primary-900 bg-transparent font-semibold text-primary-900 hover:bg-primary-200 active:bg-primary-300",
} as const;

const inversePrimary =
  "border border-transparent bg-primary-100 font-medium text-primary-1000 hover:bg-primary-200 active:bg-primary-300";

const sizes = {
  primary: {
    default: "gap-1.5 px-4 py-button-y text-body",
    small: "gap-1.5 px-button-x-sm py-button-y-sm text-small",
  },
  secondary: {
    default: "gap-1.5 px-secondary-x py-3 text-body",
    small: "gap-1.5 px-2.5 py-2 text-small",
  },
} as const;

/**
 * Square action. Primary is a filled ink button; secondary is a stroke.
 * Icon-only actions use NavItem with a tooltip, not Button.
 */
export function Button({
  variant = "primary",
  tone = "default",
  size = "default",
  icon,
  href,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const iconBox = size === "small" ? "size-3" : "size-4";
  const variantClass =
    variant === "primary" && tone === "inverse"
      ? inversePrimary
      : variants[variant];
  const classes = `inline-flex min-w-20 shrink-0 cursor-pointer items-center justify-center rounded-button disabled:cursor-not-allowed disabled:opacity-40 ${motionColor} ${focusRing} ${variantClass} ${sizes[variant][size]} ${className ?? ""}`;
  const content = (
    <>
      {icon ? (
        <span className={`${iconBox} shrink-0`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {content}
    </button>
  );
}
