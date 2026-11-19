"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
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

  if (state.status === "loading") {
    return <StateMessage heading="h1" state="loading" />;
  }

  if (state.status === "empty" || state.status === "idle") {
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
