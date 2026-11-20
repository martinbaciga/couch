"use client";

import { useTranslations } from "next-intl";
import { HeroImage } from "./HeroImage";
import { HeroSearch } from "./HeroSearch";
import { ImportCard } from "./ImportCard";

/** Home page. */
export function FirstVisit() {
  const t = useTranslations();

  return (
    <div className="w-full min-w-0 -my-6">
      <section className="landing-top w-full min-w-0 md:gap-10">
        <div className="flex w-full min-w-0 flex-col items-center gap-3 pt-24 text-center md:gap-field md:pt-10">
          <HeroImage />
          <h1 className="landing-title w-full max-w-landing text-text-default">
            {t("landing.title")}
          </h1>
          <p className="w-full max-w-landing text-search text-text-muted md:text-section">
            {t("landing.subtitle")}
          </p>
        </div>
        <div className="min-h-0 flex-1 md:hidden" />
        <HeroSearch />
      </section>
      <div className="mx-auto w-full max-w-search pt-3 pb-10 md:pt-10 md:pb-20">
        <ImportCard />
      </div>
    </div>
  );
}
