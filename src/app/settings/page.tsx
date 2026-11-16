import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.title") };
}

export default async function SettingsPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto flex w-full max-w-settings flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-bold sm:text-heading">
          {t("settings.title")}
        </h1>
        <p className="text-search text-text-muted">{t("settings.subtitle")}</p>
      </div>
      <SettingsForm />
    </div>
  );
}
