import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { MessageCard } from "@/components/ui/MessageCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("notFound.title"),
    robots: { index: false },
  };
}

/**
 * Unknown URLs. A missing title stays on the title route.
 * The offset is the space under the header in the 404 frames.
 */
export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="pt-8 md:pt-20">
      <MessageCard
        heading="h1"
        eyebrow={t("notFound.eyebrow")}
        title={t("notFound.title")}
        body={t("notFound.body")}
        action={
          <Button variant="secondary" size="small" href="/">
            {t("notFound.action")}
          </Button>
        }
      />
    </div>
  );
}
