"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CountryServices } from "@/components/setup/CountryServices";
import { countryServicesView } from "@/components/setup/country-services";
import type { CountryOption } from "@/components/ui/CountrySelect";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ServiceOption } from "@/components/ui/ServiceOption";
import { ServiceSearch } from "@/components/ui/ServiceSearch";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { useToast } from "@/components/ui/Toast";
import { readSettings } from "@/lib/storage/settings";
import {
  clearDeviceData,
  removeStored,
  saveSettings,
  useSettings,
} from "@/lib/storage/use-settings";
import { useWatchlist } from "@/lib/storage/use-watchlist";
import { WATCHLIST_KEY, type WatchlistSummary } from "@/lib/storage/watchlist";
import { posterUrl } from "@/lib/tmdb/poster";

type Status = "loading" | "ready" | "unavailable" | "busy";

type Region = CountryOption;

type Service = {
  id: number;
  name: string;
  logoPath: string | null;
};

type ServicePayload = {
  services: Service[];
  catalogue: Service[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRegions(value: unknown): Region[] | null {
  if (!isRecord(value) || !Array.isArray(value.regions)) return null;
  const regions: Region[] = [];
  for (const item of value.regions) {
    if (!isRecord(item)) return null;
    if (typeof item.code !== "string" || typeof item.name !== "string")
      return null;
    regions.push({ code: item.code, name: item.name });
  }
  return regions;
}

function parseService(value: unknown): Service | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "number" || !Number.isInteger(value.id)) return null;
  if (typeof value.name !== "string") return null;
  if (value.logoPath !== null && typeof value.logoPath !== "string")
    return null;
  return { id: value.id, name: value.name, logoPath: value.logoPath };
}

function parseServices(value: unknown): ServicePayload | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.services) || !Array.isArray(value.catalogue))
    return null;
  const services: Service[] = [];
  const catalogue: Service[] = [];
  for (const item of value.services) {
    const service = parseService(item);
    if (!service) return null;
    services.push(service);
  }
  for (const item of value.catalogue) {
    const service = parseService(item);
    if (!service) return null;
    catalogue.push(service);
  }
  return { services, catalogue };
}

async function fetchRegions(
  signal: AbortSignal,
): Promise<
  { status: "ready"; regions: Region[] } | { status: "busy" | "unavailable" }
> {
  const response = await fetch("/api/regions", { signal });
  if (response.status === 429) return { status: "busy" };
  if (!response.ok) return { status: "unavailable" };
  const regions = parseRegions(await response.json());
  return regions ? { status: "ready", regions } : { status: "unavailable" };
}

async function fetchServices(
  country: string,
  signal: AbortSignal,
): Promise<
  | { status: "ready"; payload: ServicePayload }
  | { status: "busy" | "unavailable" }
> {
  const response = await fetch(
    `/api/services?country=${encodeURIComponent(country)}`,
    { signal },
  );
  if (response.status === 429) return { status: "busy" };
  if (!response.ok) return { status: "unavailable" };
  const payload = parseServices(await response.json());
  return payload ? { status: "ready", payload } : { status: "unavailable" };
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Country, services, and the data saved on this device. Saves as you change it. */
export function SettingsForm() {
  const t = useTranslations();
  const format = useFormatter();
  const { showToast } = useToast();
  const stored = useSettings();
  const watchlist = useWatchlist();
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [regionStatus, setRegionStatus] = useState<Status>("loading");
  const [regionAttempt, setRegionAttempt] = useState(0);
  const [pinned, setPinned] = useState<number[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [catalogue, setCatalogue] = useState<Service[]>([]);
  const [serviceStatus, setServiceStatus] = useState<Status>("loading");
  const [serviceAttempt, setServiceAttempt] = useState(0);
  const [removed, setRemoved] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"watchlist" | "all" | null>(null);
  const names = useRef(new Map<number, string>());
  const seenCountry = useRef<string | null>(null);
  const pinnedRef = useRef<number[] | null>(null);

  const selectedIds = stored?.serviceIds ?? [];
  const active = stored?.country ?? null;
  const visiblePins = pinned ?? selectedIds;
  const servicesView = countryServicesView(active, selectedIds.length);

  const retryRegions = useCallback(() => {
    setRegionStatus("loading");
    setRegionAttempt((attempt) => attempt + 1);
  }, []);

  const retryServices = useCallback(() => {
    setServiceStatus("loading");
    setServiceAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRegions(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "ready") {
          setRegions(result.regions);
          setRegionStatus("ready");
          return;
        }
        setRegionStatus(result.status);
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setRegionStatus("unavailable");
      });
    return () => controller.abort();
  }, [regionAttempt]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const saved = readSettings(window.localStorage);
    const ids = saved?.serviceIds ?? [];
    const announce =
      seenCountry.current !== null && seenCountry.current !== active;
    fetchServices(active, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status !== "ready") {
          setServiceStatus(result.status);
          return;
        }
        const known = new Set(
          result.payload.catalogue.map((service) => service.id),
        );
        const kept = ids.filter((id) => known.has(id));
        const removedNames = ids.flatMap((id) => {
          if (known.has(id)) return [];
          const name = names.current.get(id);
          return name ? [name] : [];
        });
        for (const service of result.payload.catalogue) {
          names.current.set(service.id, service.name);
        }
        const nextPins = (pinnedRef.current ?? ids).filter((id) =>
          known.has(id),
        );
        for (const id of kept) {
          if (!nextPins.includes(id)) nextPins.push(id);
        }
        pinnedRef.current = nextPins;
        setServices(result.payload.services);
        setCatalogue(result.payload.catalogue);
        setPinned(nextPins);
        setRemoved(announce ? removedNames : []);
        seenCountry.current = active;
        setServiceStatus("ready");
        const changed =
          kept.length !== ids.length ||
          kept.some((id, index) => id !== ids[index]);
        if (saved?.country === active && changed) {
          saveSettings({
            country: active,
            serviceIds: kept,
            updatedAt: new Date().toISOString(),
          });
        }
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setServiceStatus("unavailable");
      });
    return () => controller.abort();
  }, [active, serviceAttempt]);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  function chooseCountry(code: string) {
    if (code !== active) {
      setServiceStatus("loading");
      setRemoved([]);
    }
    saveSettings({
      country: code,
      serviceIds: readSettings(window.localStorage)?.serviceIds ?? [],
      updatedAt: new Date().toISOString(),
    });
    showToast(t("toast.saved"));
  }

  function toggleService(id: number) {
    if (!active) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    const pins = pinnedRef.current ?? visiblePins;
    const nextPins = pins.includes(id) ? pins : [...pins, id];
    pinnedRef.current = nextPins;
    setPinned(nextPins);
    saveSettings({
      country: active,
      serviceIds: next,
      updatedAt: new Date().toISOString(),
    });
    showToast(t("toast.saved"));
  }

  function confirmAction() {
    if (confirm === "watchlist") {
      removeStored(WATCHLIST_KEY);
    } else if (confirm === "all") {
      clearDeviceData();
      pinnedRef.current = [];
      setPinned([]);
      setRemoved([]);
      seenCountry.current = null;
    }
    setConfirm(null);
    showToast(t("toast.saved"));
  }

  const baseIds = new Set(services.map((service) => service.id));
  const shown = [
    ...services,
    ...catalogue.filter(
      (service) => visiblePins.includes(service.id) && !baseIds.has(service.id),
    ),
  ];
  const searchable = catalogue.map((service) => ({
    id: service.id,
    name: service.name,
    src: posterUrl(service.logoPath, "w92"),
  }));

  return (
    <div className="flex flex-col gap-8">
      {regionStatus === "loading" ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <p className="sr-only">{t("states.loading.title")}</p>
          <Skeleton className="h-13 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}
      {regionStatus === "unavailable" || regionStatus === "busy" ? (
        <StateMessage
          state={regionStatus}
          autoRetry={regionStatus === "busy"}
          attempt={regionAttempt}
          onRetry={retryRegions}
        />
      ) : null}
      {regionStatus === "ready" ? (
        <CountryServices
          options={regions ?? []}
          country={active}
          onCountry={chooseCountry}
          selectedCount={selectedIds.length}
        >
          {serviceStatus === "loading" ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <p className="sr-only">{t("states.loading.title")}</p>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : null}
          {serviceStatus === "unavailable" || serviceStatus === "busy" ? (
            <StateMessage
              state={serviceStatus}
              autoRetry={serviceStatus === "busy"}
              attempt={serviceAttempt}
              onRetry={retryServices}
            />
          ) : null}
          {serviceStatus === "ready" ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
              {shown.map((service, index) => (
                <li
                  key={service.id}
                  className={
                    shown.length % 2 === 1 && index === shown.length - 1
                      ? "col-span-2"
                      : undefined
                  }
                >
                  <ServiceOption
                    name={service.name}
                    src={posterUrl(service.logoPath, "w92")}
                    selected={selectedIds.includes(service.id)}
                    onToggle={() => toggleService(service.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {serviceStatus === "ready" && active && removed.length > 0 ? (
            <p className="text-body font-medium text-text-muted">
              {t("settings.removed", {
                count: removed.length,
                services: format.list(removed, { type: "conjunction" }),
                country:
                  regions?.find((region) => region.code === active)?.name ??
                  active,
              })}
            </p>
          ) : null}
        </CountryServices>
      ) : null}

      {regionStatus === "ready" &&
      servicesView.search &&
      serviceStatus === "ready" ? (
        <ServiceSearch
          services={searchable}
          selectedIds={selectedIds}
          onToggle={toggleService}
        />
      ) : null}

      <section className="flex flex-col gap-5 rounded-panel border border-border-default bg-surface-card px-5 py-6 sm:p-6">
        <h2 className="text-section font-bold">{t("settings.savedTitle")}</h2>
        {watchlist ? (
          <>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-ui font-medium">{t("settings.watchlist")}</p>
                <p className="text-body text-text-muted">
                  {watchlistText(watchlist)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setConfirm("watchlist")}
              >
                {t("settings.removeWatchlist")}
              </Button>
            </div>
            <div className="border-t border-border-subtle" />
          </>
        ) : null}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-ui font-medium">{t("settings.everything")}</p>
            <p className="text-body text-text-muted">
              {t("settings.everythingBody")}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setConfirm("all")}>
            {t("settings.clearAll")}
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === "all"
            ? t("settings.clearTitle")
            : t("settings.removeTitle")
        }
        body={
          confirm === "all"
            ? t("settings.clearBody")
            : t("settings.removeBody", { count: watchlist?.count ?? 0 })
        }
        confirmLabel={
          confirm === "all"
            ? t("settings.clearAll")
            : t("settings.removeWatchlist")
        }
        cancelLabel={
          confirm === "all" ? t("settings.cancel") : t("settings.keep")
        }
        onConfirm={confirmAction}
        onCancel={closeConfirm}
      />
    </div>
  );

  function watchlistText(summary: WatchlistSummary): string {
    const importedDate = new Date(summary.importedAt);
    const imported = Number.isNaN(importedDate.getTime())
      ? summary.importedAt
      : format.dateTime(importedDate, { day: "numeric", month: "short" });
    if (!summary.checkedAt) {
      return t("settings.watchlistImported", {
        count: summary.count,
        imported,
      });
    }
    const checkedDate = new Date(summary.checkedAt);
    const checked = Number.isNaN(checkedDate.getTime())
      ? summary.checkedAt
      : format.relativeTime(checkedDate);
    return t("settings.watchlistChecked", {
      count: summary.count,
      imported,
      checked,
    });
  }
}
