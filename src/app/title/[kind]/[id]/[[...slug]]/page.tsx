import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { RetryReset, RetryState } from "@/components/title/RetryState";
import { TitleView } from "@/components/title/TitleView";
import { normalizeProviders } from "@/lib/availability/normalize";
import type { TitleAvailability } from "@/lib/availability/types";
import { listServiceMarks, type ServiceMark } from "@/lib/services/marks";
import {
  canonicalSlugRedirect,
  parseTitleRef,
  singleSlug,
  titlePath,
} from "@/lib/title-ref";
import { toApiError } from "@/lib/tmdb/errors";
import { getMovie, getTv, getWatchProviders } from "@/lib/tmdb/client";
import { posterUrl } from "@/lib/tmdb/poster";
import type { TitleDetails } from "@/lib/tmdb/types";

type TitleRouteProps = {
  params: Promise<{ kind: string; id: string; slug?: string[] }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: TitleRouteProps): Promise<Metadata> {
  await connection();
  const t = await getTranslations();
  const format = await getFormatter();
  const { kind, id } = await params;
  const ref = parseTitleRef(kind, id);
  if (!ref) return { title: t("states.notFound.title") };

  const loaded = await loadTitle(ref.kind, ref.id);
  if (loaded.failure === "busy") return { title: t("states.busy.title") };
  if (loaded.failure === "unavailable") {
    return { title: t("states.unavailable.title") };
  }
  if (!loaded.details) return { title: t("states.notFound.title") };

  const details = loaded.details;
  const path = titlePath(ref.kind, ref.id, details.title);
  const origin = await requestOrigin();
  const canonical = new URL(path, origin).href;
  const shareTitle =
    details.year === null
      ? t("title.shareTitle", { title: details.title })
      : t("title.shareTitleYear", {
          title: details.title,
          year: format.number(details.year, { useGrouping: false }),
        });
  const description = t("title.shareDescription", { title: details.title });
  const image =
    posterUrl(details.posterPath, "w780") ??
    new URL("/brand/opengraph.png", origin).href;

  return {
    title: shareTitle,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: shareTitle,
      description,
      url: canonical,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [image],
    },
  };
}

/**
 * Title, the home-country card, and where else it streams.
 * The slug is cosmetic. A wrong one redirects to the canonical path.
 * Invalid links and unknown titles use the not-found state.
 */
export default async function TitlePage({
  params,
  searchParams,
}: TitleRouteProps) {
  await connection();
  const [{ kind, id, slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
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

  const target = canonicalSlugRedirect(
    ref.kind,
    ref.id,
    loaded.details.title,
    singleSlug(slug),
    query.view,
  );
  if (target) permanentRedirect(target);

  const view = query.view === "country" ? "country" : "service";

  return (
    <>
      <RetryReset />
      <TitleView
        details={loaded.details}
        availability={loaded.availability}
        services={loaded.services}
        view={view}
      />
    </>
  );
}

/** The host that served this request, so a shared link stays on that host. */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = (forwardedHost ?? headerList.get("host") ?? "localhost")
    .split(",")[0]
    ?.trim();
  const proto = (headerList.get("x-forwarded-proto") ?? "http")
    .split(",")[0]
    ?.trim();
  return `${proto || "http"}://${host || "localhost"}`;
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
