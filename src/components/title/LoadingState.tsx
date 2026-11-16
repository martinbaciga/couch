"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StateMessage } from "@/components/ui/StateMessage";

/** Skeleton first. The message card replaces it when the lookup is still going. */
const SLOW_LOADING_MS = 4000;

export function LoadingState({ children }: { children: ReactNode }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (slow) return <StateMessage state="loading" heading="h1" />;
  return children;
}
