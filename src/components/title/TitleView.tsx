"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSituation, type Settings } from "@/lib/availability/status";
import type { TitleAvailability } from "@/lib/availability/types";
import type { ServiceMark } from "@/lib/services/marks";
import type { TitleDetails } from "@/lib/tmdb/types";
import { useSettings } from "@/lib/storage/use-settings";
import { HomeCard } from "./HomeCard";
import { OtherCountries } from "./OtherCountries";
import { TitleHeader } from "./TitleHeader";

type View = "service" | "country";

function subscribeToMount() {
  return () => {};
}

/**
 * Settings live on this device, so the card waits until they can be read.
 * The server snapshot stays on the skeleton. After hydration the client
 * snapshot is ready, without flashing the empty prompt.
 */
function useClientReady(): boolean {
  return useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
}
export function TitleView({
  details,
  availability,
  services,
  view: initialView,
}: {
  details: TitleDetails;
  availability: TitleAvailability;
  services: ServiceMark[];
  view: View;
}) {
  const ready = useClientReady();
  const saved = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState(initialView);
  const [trackedView, setTrackedView] = useState(initialView);
  if (initialView !== trackedView) {
    setTrackedView(initialView);
    setView(initialView);
  }
  const settings: Settings = {
    country: saved?.country ?? null,
    serviceIds: saved?.serviceIds ?? [],
  };
  const situation = getSituation(availability, settings);
  const countries =
    situation.status === "no-settings" || situation.status === "no-services";

  function onViewChange(next: View) {
    setView(next);
    const params = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    );
    if (next === "country") params.set("view", "country");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      <TitleHeader
        details={details}
        country={ready ? (saved?.country ?? null) : null}
      />
      <div
        className="flex min-w-0 flex-1 flex-col gap-6"
        aria-busy={ready ? undefined : true}
      >
        {ready ? (
          <>
            <HomeCard
              availability={availability}
              settings={settings}
              services={services}
            />
            {situation.status === "no-data" ? null : (
              <OtherCountries
                availability={availability}
                settings={settings}
                services={services}
                view={view}
                onViewChange={onViewChange}
                presentation={countries ? "countries" : "services"}
              />
            )}
          </>
        ) : (
          <AvailabilitySkeleton />
        )}
      </div>
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3.5 rounded-panel border border-border-default bg-surface-card p-6">
        <Skeleton className="h-5 w-50 max-w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <Skeleton className="h-5.5 w-60 max-w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
