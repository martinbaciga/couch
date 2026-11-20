"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ImportIcon } from "@/components/ui/icons";
import { focusRing } from "@/components/ui/styles";

const LETTERBOXD_URL = "https://letterboxd.com";

/** First-visit invitation to bring a Letterboxd watchlist. */
export function ImportCard() {
  const t = useTranslations();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary-600 bg-surface-card p-4.5">
      <div>
        <h2 className="landing-card-title text-text-default">
          {t("landing.importTitle")}
        </h2>
        <p className="text-body text-text-muted">{t("landing.importBody")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="secondary"
          size="small"
          href="/watchlist"
          icon={<ImportIcon />}
        >
          {t("landing.chooseCsv")}
        </Button>
        <a
          href={LETTERBOXD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 items-center text-small text-primary-900 underline underline-offset-2 ${focusRing}`}
        >
          {t("landing.exportHelp")}
        </a>
      </div>
    </section>
  );
}
