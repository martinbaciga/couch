import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/title/LoadingState";
import { TitleLoading } from "@/components/title/TitleLoading";

export default async function TitleLoadingPage() {
  const t = await getTranslations();
  return (
    <LoadingState>
      <TitleLoading status={t("states.loading.title")} />
    </LoadingState>
  );
}
