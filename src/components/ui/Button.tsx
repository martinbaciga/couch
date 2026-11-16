import type { ButtonHTMLAttributes, ReactNode } from "react";
import { focusRing, motionColor } from "./styles";

type ButtonProps = {
  variant?: "primary" | "secondary";
  size?: "default" | "small";
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants = {
  primary:
    "border border-transparent bg-primary-900 font-medium text-text-on-inverse hover:bg-primary-800 active:bg-primary-1000",
  secondary:
    "border border-primary-900 bg-transparent font-semibold text-primary-900 hover:border-border-strong hover:bg-surface-card active:bg-primary-200",
} as const;

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
  size = "default",
  icon,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const iconBox = size === "small" ? "size-3" : "size-4";

  return (
    <button
      type={type}
      className={`inline-flex min-w-20 shrink-0 items-center justify-center rounded-button disabled:cursor-not-allowed disabled:opacity-40 ${motionColor} ${focusRing} ${variants[variant]} ${sizes[variant][size]} ${className ?? ""}`}
      {...props}
    >
      {icon ? (
        <span className={`${iconBox} shrink-0`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
