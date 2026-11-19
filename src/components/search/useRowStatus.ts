"use client";

import { useEffect, useRef, useState } from "react";
import { createLimiter } from "@/lib/search/limit";
import {
  parseTitleLookup,
  searchStatusLine,
  type StatusLine,
  type TitleLookup,
} from "@/lib/search/status-line";
import type { ServiceMark } from "@/lib/services/marks";
import { useSettings } from "@/lib/storage/use-settings";

const limit = createLimiter(4);
const cache = new Map<string, TitleLookup>();

export type RowPhase = "wait" | "loading" | "ready" | "hidden";

/**
 * Loads one title as its row scrolls into view. Failures leave the
 * status line out rather than showing an error on the row.
 */
export function useRowStatus(kind: "movie" | "tv", id: number) {
  const ref = useRef<HTMLAnchorElement>(null);
  const key = `${kind}:${id}`;
  const cached = cache.get(key) ?? null;
  const [fetched, setFetched] = useState<TitleLookup | null>(null);
  const [phase, setPhase] = useState<RowPhase>(cached ? "ready" : "wait");
  const settings = useSettings();
  const lookup = fetched ?? cached;

  useEffect(() => {
    const node = ref.current;
    if (!node || phase !== "wait") return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setPhase("loading");
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [key, phase]);

  useEffect(() => {
    if (phase !== "loading") return;
    const controller = new AbortController();
    void limit(async () => {
      const response = await fetch(`/api/title/${kind}/${id}`, {
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return parseTitleLookup(await response.json());
    }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result) {
          setPhase("hidden");
          return;
        }
        cache.set(key, result);
        setFetched(result);
        setPhase("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase("hidden");
      });
    return () => controller.abort();
  }, [phase, kind, id, key]);

  const line: StatusLine | null = lookup
    ? searchStatusLine(lookup.availability, {
        country: settings?.country ?? null,
        serviceIds: settings?.serviceIds ?? [],
      })
    : null;

  return {
    ref,
    phase,
    line,
    services: lookup?.services ?? [],
  };
}

export type { ServiceMark };
