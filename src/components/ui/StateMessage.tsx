"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { retryDelay } from "@/lib/retry";
import { Button } from "./Button";
import { MessageCard } from "./MessageCard";

type MessageState =
  | "loading"
  | "no-results"
  | "unavailable"
  | "busy"
  | "wrong-file"
  | "empty-file"
  | "not-found";

type StateMessageProps = {
  state: MessageState;
  query?: string;
  heading?: "h1" | "h2";
  /** Busy only. Waits, then calls onRetry, doubling until one minute. */
  autoRetry?: boolean;
  attempt?: number;
  onRetry?: () => void;
  onClear?: () => void;
  onChoose?: () => void;
};

/** The seven system states. Copy comes from messages, not from the caller. */
export function StateMessage({
  state,
  query = "",
  heading = "h2",
  autoRetry = false,
  attempt = 0,
  onRetry,
  onClear,
  onChoose,
}: StateMessageProps) {
  const t = useTranslations();

  useEffect(() => {
    if (state !== "busy" || !autoRetry || !onRetry) return;
    const timer = window.setTimeout(onRetry, retryDelay(attempt));
    return () => window.clearTimeout(timer);
  }, [state, autoRetry, attempt, onRetry]);

  const action =
    state === "unavailable" ? (
      <Button variant="secondary" size="small" onClick={onRetry}>
        {t("states.unavailable.action")}
      </Button>
    ) : state === "busy" ? (
      <Button variant="secondary" size="small" onClick={onRetry}>
        {t("states.busy.action")}
      </Button>
    ) : state === "no-results" ? (
      <Button variant="secondary" size="small" onClick={onClear}>
        {t("states.noResults.action")}
      </Button>
    ) : state === "wrong-file" ? (
      <Button variant="secondary" size="small" onClick={onChoose}>
        {t("states.wrongFile.action")}
      </Button>
    ) : state === "empty-file" ? (
      <Button variant="secondary" size="small" onClick={onChoose}>
        {t("states.emptyFile.action")}
      </Button>
    ) : state === "not-found" ? (
      <Button variant="secondary" size="small" href="/search">
        {t("states.notFound.action")}
      </Button>
    ) : null;

  if (state === "loading") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.loading.eyebrow")}
        title={t("states.loading.title")}
        body={t("states.loading.body")}
      />
    );
  }

  if (state === "no-results") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.noResults.eyebrow")}
        title={t("states.noResults.title", { query })}
        body={t("states.noResults.body")}
        action={action}
      />
    );
  }

  if (state === "unavailable") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.unavailable.eyebrow")}
        title={t("states.unavailable.title")}
        body={t("states.unavailable.body")}
        action={action}
      />
    );
  }

  if (state === "busy") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.busy.eyebrow")}
        title={t("states.busy.title")}
        body={t("states.busy.body")}
        action={action}
      />
    );
  }

  if (state === "wrong-file") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.wrongFile.eyebrow")}
        title={t("states.wrongFile.title")}
        body={t("states.wrongFile.body")}
        action={action}
      />
    );
  }

  if (state === "empty-file") {
    return (
      <MessageCard
        heading={heading}
        eyebrow={t("states.emptyFile.eyebrow")}
        title={t("states.emptyFile.title")}
        body={t("states.emptyFile.body")}
        action={action}
      />
    );
  }

  return (
    <MessageCard
      heading={heading}
      eyebrow={t("states.notFound.eyebrow")}
      title={t("states.notFound.title")}
      body={t("states.notFound.body")}
      action={action}
    />
  );
}
