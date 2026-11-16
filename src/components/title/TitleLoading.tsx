import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The title page keeps its layout while the lookup is in flight.
 * Poster block, title bars, the home card, and the other-countries rows.
 */
export function TitleLoading({ status }: { status: string }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      <p className="sr-only" role="status">
        {status}
      </p>
      <div className="flex w-full items-start gap-4 md:w-poster-lg md:flex-col md:gap-4.5">
        <div
          className="aspect-poster w-poster shrink-0 rounded-xl bg-surface-field shadow-poster md:w-full"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:gap-4.5">
          <Skeleton className="h-7 w-50 max-w-full md:h-10 md:w-55" />
          <Skeleton className="h-3.5 w-28 md:h-4 md:w-30" />
          <Skeleton className="h-9.5 w-24 md:hidden" />
        </div>
      </div>
      <div
        className="flex min-w-0 flex-1 flex-col gap-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3.5 rounded-panel border border-border-default bg-surface-card p-6">
          <Skeleton className="h-5 w-50 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
        <Skeleton className="h-5.5 w-60 max-w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="hidden h-14 w-full md:block" />
      </div>
    </div>
  );
}
