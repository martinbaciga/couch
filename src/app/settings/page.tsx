import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/settings/BackLink";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { safeReturnPath } from "@/lib/return-path";

type SettingsPageProps = {
  searchParams: Promise<{ return?: string | string[] }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.title") };
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const t = await getTranslations();

  return (
    <div className="mx-auto flex w-full max-w-settings flex-col gap-8">
      {/* The return query is request data, so only this link waits on it. */}
      <Suspense fallback={null}>
        <SettingsReturn searchParams={searchParams} />
      </Suspense>
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

async function SettingsReturn({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.return)
    ? (params.return[0] ?? null)
    : (params.return ?? null);
  const path = safeReturnPath(raw);
  if (!path) return null;
  return <BackLink path={path} />;
}
