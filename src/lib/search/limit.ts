const ABORT = "AbortError";

/**
 * Caps how many title lookups run at once. A row that leaves the queue
 * before it starts does not take a slot.
 */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function pump() {
    while (active < max && queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      active += 1;
      job();
    }
  }

  return function limit<T>(
    task: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }

      const run = () => {
        if (signal?.aborted) {
          active -= 1;
          reject(abortError());
          pump();
          return;
        }
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      };

      queue.push(run);
      signal?.addEventListener(
        "abort",
        () => {
          const index = queue.indexOf(run);
          if (index < 0) return;
          queue.splice(index, 1);
          reject(abortError());
        },
        { once: true },
      );
      pump();
    });
  };
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = ABORT;
  return error;
}
