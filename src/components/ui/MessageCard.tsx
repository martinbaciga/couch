import type { ReactNode } from "react";

type MessageCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  action?: ReactNode;
  heading?: "h1" | "h2";
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
}: MessageCardProps) {
  const Heading = heading;

  return (
    <section className="flex w-full max-w-message flex-col items-start gap-2 rounded-xl border border-border-default bg-surface-card p-5">
      <p className="eyebrow">{eyebrow}</p>
      <Heading className="message-title text-text-default">{title}</Heading>
      <p className="text-body text-text-muted">{body}</p>
      {action}
    </section>
  );
}
