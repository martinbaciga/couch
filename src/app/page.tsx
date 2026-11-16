import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations();
  return <h1 className="text-heading">{t("home.title")}</h1>;
}
