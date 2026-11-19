import { describe, expect, it } from "vitest";
import { createLimiter } from "./limit";

describe("createLimiter", () => {
  it("runs at most four lookups at once", async () => {
    const limit = createLimiter(4);
    let active = 0;
    let max = 0;
    const jobs = Array.from({ length: 6 }, () =>
      limit(async () => {
        active += 1;
        max = Math.max(max, active);
        await Promise.resolve();
        active -= 1;
      }),
    );
    await Promise.all(jobs);
    expect(max).toBe(4);
  });

  it("does not start a lookup that was cancelled while waiting", async () => {
    const limit = createLimiter(4);
    let started = 0;
    const release: Array<() => void> = [];
    const hanging = Array.from({ length: 4 }, () =>
      limit(
        () =>
          new Promise<void>((resolve) => {
            started += 1;
            release.push(resolve);
          }),
      ),
    );
    const controller = new AbortController();
    const waiting = limit(() => {
      started += 1;
      return Promise.resolve();
    }, controller.signal);
    controller.abort();
    for (const done of release) done();
    await Promise.all(hanging);
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    expect(started).toBe(4);
  });
});
