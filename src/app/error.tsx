"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { MessageCard } from "@/components/ui/MessageCard";

export default function RootError({
  reset,
}: {
  error: unknown;
  reset: () => void;
  retry?: () => void;
}) {
  const t = useTranslations();

  return (
    <MessageCard
      heading="h1"
      eyebrow={t("states.unavailable.eyebrow")}
      title={t("states.unavailable.title")}
      body={t("states.unavailable.body")}
      action={
        <Button variant="secondary" size="small" onClick={reset}>
          {t("states.unavailable.action")}
        </Button>
      }
    />
  );
}
