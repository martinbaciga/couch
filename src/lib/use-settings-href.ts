"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { settingsHref } from "./return-path";

/**
 * Settings link for the page on screen. The query is included and the hash
 * is not, because `useSearchParams` never sees it.
 */
export function useSettingsHref(): string {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const path = search ? `${pathname}?${search}` : pathname;
  return settingsHref(path);
}
