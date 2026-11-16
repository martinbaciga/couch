"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StateMessage } from "@/components/ui/StateMessage";

let attempt = 0;

/** A later successful lookup starts the wait back at one second. */
export function RetryReset() {
  useEffect(() => {
    attempt = 0;
  }, []);
  return null;
}

/**
 * Shown when the title lookup is rate limited or the data service fails.
 * Busy retries on its own; both offer Try again.
 */
export function RetryState({ state }: { state: "busy" | "unavailable" }) {
  const router = useRouter();
  const onRetry = useCallback(() => {
    attempt += 1;
    router.refresh();
  }, [router]);

  return (
    <StateMessage
      state={state}
      heading="h1"
      autoRetry={state === "busy"}
      attempt={attempt}
      onRetry={onRetry}
    />
  );
}
