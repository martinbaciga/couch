"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import type { LoadedSearch } from "@/lib/search/query";
import { titleUrl } from "@/lib/search/query";
import { TitleRow, StatusText, logosFor } from "./TitleRow";
import { useRowStatus } from "./useRowStatus";
import { useTitleSearch } from "./useTitleSearch";

type SearchResultsProps = {
  query: string;
  initial: LoadedSearch | null;
};

/** First page comes from the server. Further pages go through the shared hook. */
export function SearchResults({ query, initial }: SearchResultsProps) {
  const t = useTranslations();
  const router = useRouter();
  const { state, loadMore, retry, canLoadMore } = useTitleSearch(query, {
    initial,
  });

  if (state.status === "error") {
    return (
      <StateMessage
        heading="h1"
        state={state.error === "rate_limited" ? "busy" : "unavailable"}
        onRetry={retry}
      />
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return <SearchResultsSkeleton />;
  }

  if (state.status === "empty") {
    return (
      <StateMessage
        heading="h1"
        state="no-results"
        query={query}
        onClear={() => router.push("/")}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-results flex-col gap-6">
      <h1 className="text-title font-bold md:text-heading">
        {t("search.heading", { count: state.totalResults, query })}
      </h1>
      <ul className="flex list-none flex-col gap-3 p-0">
        {state.results.map((result) => (
          <li key={`${result.kind}-${result.id}`}>
            <Hit
              kind={result.kind}
              id={result.id}
              title={result.title}
              year={result.year}
              posterPath={result.posterPath}
            />
          </li>
        ))}
      </ul>
      {canLoadMore || state.loadingMore || state.moreError ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={state.loadingMore}
          >
            {state.moreError
              ? t("states.unavailable.action")
              : t("search.showMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Placeholder rows while the first page is still on its way. */
export function SearchResultsSkeleton() {
  const t = useTranslations();

  return (
    <div
      className="mx-auto flex w-full max-w-results flex-col gap-6"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        {t("states.loading.eyebrow")}
      </p>
      <Skeleton className="h-8 w-64 max-w-full md:h-10" />
      <ul className="flex list-none flex-col gap-3 p-0">
        {rowKeys.map((key) => (
          <li
            key={key}
            className="flex items-center gap-4 rounded-control border border-border-subtle bg-surface-card px-4 py-3"
          >
            <Skeleton className="aspect-poster w-12 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-3.5 w-24" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const rowKeys = ["a", "b", "c", "d", "e"] as const;

function Hit({
  kind,
  id,
  title,
  year,
  posterPath,
}: {
  kind: "movie" | "tv";
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
}) {
  const status = useRowStatus(kind, id);

  return (
    <TitleRow
      density="card"
      href={titleUrl(kind, id)}
      title={title}
      year={year}
      kind={kind}
      posterPath={posterPath}
      status={
        <StatusText
          phase={status.phase}
          line={status.line}
          services={status.services}
        />
      }
      logos={logosFor(status.line, status.services)}
      rowRef={status.ref}
    />
  );
}
