const RETRY_BASE_MS = 1000;
const RETRY_CAP_MS = 60_000;

/**
 * Wait before the next automatic try.
 * The first wait is one second, then it doubles, and it stops at one minute.
 */
export function retryDelay(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 0) return RETRY_BASE_MS;
  const delay = RETRY_BASE_MS * 2 ** Math.min(attempt, 16);
  return Math.min(delay, RETRY_CAP_MS);
}
