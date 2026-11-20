import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { focusRing } from "@/components/ui/styles";

/** Credit line on every page. Freshness is added by the title and watchlist pages. */
export async function Footer() {
  const t = await getTranslations();

  return (
    <footer className="mt-auto border-t border-primary-800 text-footer text-primary-800">
      <div className="mx-auto flex w-full max-w-page flex-col items-start gap-2 px-gutter py-6 md:flex-row md:items-center md:justify-between md:py-footer">
        <p>{t("footer.credit")}</p>
        <Link
          href="/about"
          className={`rounded-button underline underline-offset-2 ${focusRing}`}
        >
          {t("footer.about")}
        </Link>
      </div>
    </footer>
  );
}
