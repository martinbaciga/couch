import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RetryReset, RetryState } from "@/components/title/RetryState";
import { toApiError } from "@/lib/tmdb/errors";
import { getMovie, getTv } from "@/lib/tmdb/client";
import type { TitleDetails } from "@/lib/tmdb/types";
import { parseTitleRef } from "@/lib/title-ref";

type TitleRouteProps = {
  params: Promise<{ kind: string; id: string }>;
};

export async function generateMetadata({
  params,
}: TitleRouteProps): Promise<Metadata> {
  const t = await getTranslations();
  const { kind, id } = await params;
  const ref = parseTitleRef(kind, id);
  if (!ref) return { title: t("states.notFound.title") };

  const loaded = await loadTitle(ref.kind, ref.id);
  if (loaded.failure === "busy") return { title: t("states.busy.title") };
  if (loaded.failure === "unavailable") {
    return { title: t("states.unavailable.title") };
  }
  if (!loaded.details) return { title: t("states.notFound.title") };
  return { title: loaded.details.title };
}

/**
 * Confirms the title exists. MAR-15 draws the title screen.
 * Invalid links and unknown titles use the not-found state.
 */
export default async function TitlePage({ params }: TitleRouteProps) {
  const { kind, id } = await params;
  const ref = parseTitleRef(kind, id);
  if (!ref) notFound();

  const loaded = await loadTitle(ref.kind, ref.id);
  if (!loaded.details) {
    if (loaded.failure === "busy") return <RetryState state="busy" />;
    if (loaded.failure === "unavailable") {
      return <RetryState state="unavailable" />;
    }
    notFound();
  }

  return (
    <>
      <RetryReset />
      <h1 className="text-heading">{loaded.details.title}</h1>
    </>
  );
}

type LoadFailure = "busy" | "unavailable" | "not-found";

async function loadTitle(
  kind: "movie" | "tv",
  id: number,
): Promise<{ details: TitleDetails | null; failure: LoadFailure | null }> {
  try {
    const details = kind === "movie" ? await getMovie(id) : await getTv(id);
    return { details, failure: null };
  } catch (error) {
    const code = toApiError(error)?.body.error.code;
    if (code === "rate_limited") return { details: null, failure: "busy" };
    if (code === "upstream_unavailable") {
      return { details: null, failure: "unavailable" };
    }
    return { details: null, failure: "not-found" };
  }
}
