import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  SearchResults,
  SearchResultsSkeleton,
} from "@/components/search/SearchResults";
import { loadSearch } from "@/lib/search/load";
import { isSearchableQuery, normaliseQuery } from "@/lib/search/query";

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const query = await readQuery(searchParams);
  if (!isSearchableQuery(query)) {
    return { title: t("states.noResults.title", { query }) };
  }
  const loaded = await loadSearch(query, 1);
  if (!loaded.ok) {
    const key =
      loaded.error === "rate_limited"
        ? "states.busy.title"
        : "states.unavailable.title";
    return { title: t(key) };
  }
  if (loaded.payload.results.length === 0) {
    return { title: t("states.noResults.title", { query }) };
  }
  return {
    title: t("search.heading", {
      count: loaded.payload.totalResults,
      query,
    }),
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchFrame searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchFrame({ searchParams }: SearchPageProps) {
  const query = await readQuery(searchParams);
  return (
    <Suspense key={query} fallback={<SearchResultsSkeleton />}>
      <SearchPageResults query={query} />
    </Suspense>
  );
}

async function SearchPageResults({ query }: { query: string }) {
  const initial = isSearchableQuery(query) ? await loadSearch(query, 1) : null;
  return <SearchResults key={query} query={query} initial={initial} />;
}

async function readQuery(
  searchParams: SearchPageProps["searchParams"],
): Promise<string> {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  return normaliseQuery(raw);
}
