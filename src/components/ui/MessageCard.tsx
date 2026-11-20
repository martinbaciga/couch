import type { ReactNode } from "react";

type MessageCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  action?: ReactNode;
  heading?: "h1" | "h2";
  /** `fill` spans the column. The system states stay at the narrow width. */
  width?: "narrow" | "fill";
};

/**
 * One situation: what happened, and what to do next.
 * The button is the small secondary Button.
 */
export function MessageCard({
  eyebrow,
  title,
  body,
  action,
  heading = "h2",
  width = "narrow",
}: MessageCardProps) {
  const Heading = heading;
  const span = width === "fill" ? "w-full" : "w-full max-w-message";

  return (
    <section
      className={`flex ${span} flex-col items-start gap-2 rounded-xl border border-border-default bg-surface-card p-5`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <Heading className="message-title text-text-default">{title}</Heading>
      <p className="text-body text-text-muted">{body}</p>
      {action}
    </section>
  );
}
