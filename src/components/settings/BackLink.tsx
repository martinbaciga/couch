"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { focusRing } from "@/components/ui/styles";
import { backLabel } from "@/lib/return-path";

const backClass = `inline-flex min-h-11 items-center gap-1 self-start rounded-button py-3 -my-3 text-body font-medium text-text-default ${focusRing}`;

/** Link back to the page that opened Settings. The chevron is decorative. */
export function BackLink({ path }: { path: string }) {
  const t = useTranslations();

  return (
    <Link href={path} className={backClass}>
      <ChevronLeftIcon />
      {text(path, t)}
    </Link>
  );
}

function text(path: string, t: ReturnType<typeof useTranslations>): string {
  switch (backLabel(path)) {
    case "title":
      return t("settings.backTitle");
    case "home":
      return t("settings.backHome");
    case "results":
      return t("settings.backResults");
    case "back":
      return t("settings.back");
  }
}
