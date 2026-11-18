import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OtherCountriesBlock } from "@/components/title/OtherCountries";
import { RetryReset, RetryState } from "@/components/title/RetryState";
import { normalizeProviders } from "@/lib/availability/normalize";
import type { TitleAvailability } from "@/lib/availability/types";
import { listServiceMarks, type ServiceMark } from "@/lib/services/marks";
import { toApiError } from "@/lib/tmdb/errors";
import { getMovie, getTv, getWatchProviders } from "@/lib/tmdb/client";
import type { TitleDetails } from "@/lib/tmdb/types";
import { parseTitleRef } from "@/lib/title-ref";

type TitleRouteProps = {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
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
 * Confirms the title and shows where else it streams.
 * MAR-15 draws the rest of the title screen.
 * Invalid links and unknown titles use the not-found state.
 */
export default async function TitlePage({
  params,
  searchParams,
}: TitleRouteProps) {
  const [{ kind, id }, query] = await Promise.all([params, searchParams]);
  const ref = parseTitleRef(kind, id);
  if (!ref) notFound();

  const loaded = await loadTitle(ref.kind, ref.id);
  if (!loaded.details || !loaded.availability) {
    if (loaded.failure === "busy") return <RetryState state="busy" />;
    if (loaded.failure === "unavailable") {
      return <RetryState state="unavailable" />;
    }
    notFound();
  }

  const view = query.view === "country" ? "country" : "service";

  return (
    <>
      <RetryReset />
      <h1 className="text-heading">{loaded.details.title}</h1>
      <div className="mt-6">
        <OtherCountriesBlock
          availability={loaded.availability}
          services={loaded.services}
          view={view}
        />
      </div>
    </>
  );
}

type LoadFailure = "busy" | "unavailable" | "not-found";

async function loadTitle(
  kind: "movie" | "tv",
  id: number,
): Promise<{
  details: TitleDetails | null;
  availability: TitleAvailability | null;
  services: ServiceMark[];
  failure: LoadFailure | null;
}> {
  try {
    const [details, providers] = await Promise.all([
      kind === "movie" ? getMovie(id) : getTv(id),
      getWatchProviders(kind, id),
    ]);
    return {
      details,
      availability: normalizeProviders(providers, providers.fetchedAt),
      services: listServiceMarks(providers),
      failure: null,
    };
  } catch (error) {
    const code = toApiError(error)?.body.error.code;
    if (code === "rate_limited") {
      return {
        details: null,
        availability: null,
        services: [],
        failure: "busy",
      };
    }
    if (code === "upstream_unavailable") {
      return {
        details: null,
        availability: null,
        services: [],
        failure: "unavailable",
      };
    }
    return {
      details: null,
      availability: null,
      services: [],
      failure: "not-found",
    };
  }
}
