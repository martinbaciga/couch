import { afterEach, describe, expect, it, vi } from "vitest";

import { runImport, ImportError, type ImportSource } from "./runImport";

const titlePayload = {
  availability: {
    fetchedAt: "2026-11-20T00:00:00.000Z",
    countries: {},
  },
  services: [],
};

afterEach(() => {
  vi.useRealTimers();
});

describe("runImport", () => {
  it("reports progress as rows match and load", async () => {
    const events: Array<{ matched: number; loaded: number; total: number }> =
      [];
    const sources = Array.from({ length: 12 }, (_, index) => ({
      name: `Film ${index}`,
      year: 2000 + (index % 5),
    }));

    const rows = await runImport(sources, {
      fetch: fetchMatching(),
      onProgress: (progress) => events.push(progress),
    });

    expect(events[0]).toEqual({ matched: 0, loaded: 0, total: 12 });
    expect(events.at(-1)).toEqual({ matched: 12, loaded: 12, total: 12 });
    for (let index = 1; index < events.length; index += 1) {
      const previous = events[index - 1];
      const current = events[index];
      if (!previous || !current) continue;
      expect(current.matched).toBeGreaterThanOrEqual(previous.matched);
      expect(current.loaded).toBeGreaterThanOrEqual(previous.loaded);
      expect(current.loaded).toBeLessThanOrEqual(current.matched);
      expect(current.total).toBe(12);
    }
    expect(rows).toHaveLength(12);
    expect(rows.every((row) => row.match?.availability)).toBe(true);
  });

  it("emits a miss before a title has loaded, and keeps input order", async () => {
    const partial: string[] = [];
    const rows = await runImport(
      [
        {
          name: "Heat",
          year: 1995,
          uri: "https://boxd.it/heat",
          date: "2024-01-01",
        },
        { name: "Missing", year: 1990 },
      ],
      {
        fetch: fetchMatching(),
        onPartial: (row) => partial.push(row.entry.name),
      },
    );

    expect(partial).toEqual(["Missing", "Heat"]);
    expect(rows.map((row) => row.entry.name)).toEqual(["Heat", "Missing"]);
    expect(rows[0]?.match).toMatchObject({
      id: 1,
      availability: {
        availability: titlePayload.availability,
        services: [],
      },
    });
    expect(rows[0]?.entry).toMatchObject({
      uri: "https://boxd.it/heat",
      date: "2024-01-01",
    });
    expect(rows[1]?.match).toBeNull();
  });

  it("drops a repeated Letterboxd URI and a repeated title", async () => {
    const bodies: unknown[] = [];
    let titleCalls = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(input) === "/api/match") {
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        return json({
          matches: body.entries.map(() => match(5)),
        });
      }
      titleCalls += 1;
      return json(titlePayload);
    };

    const events: Array<{ total: number; loaded: number }> = [];
    const rows = await runImport(
      [
        { name: "Heat", year: 1995, uri: "https://boxd.it/heat" },
        { name: "Heat", year: 1995, uri: "https://boxd.it/heat" },
        { name: "Heat again", year: 1995, uri: "https://boxd.it/other" },
      ],
      {
        fetch: fetchImpl,
        onProgress: (progress) => events.push(progress),
      },
    );

    expect(bodies).toEqual([
      {
        entries: [
          { name: "Heat", year: 1995 },
          { name: "Heat again", year: 1995 },
        ],
      },
    ]);
    expect(titleCalls).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.match?.id).toBe(5);
    expect(events.at(-1)).toEqual({ matched: 2, loaded: 2, total: 2 });
  });

  it("keeps three match batches in flight", async () => {
    let active = 0;
    let max = 0;
    const release: Array<() => void> = [];
    const fetchImpl: typeof fetch = (input, init) => {
      if (String(input) !== "/api/match")
        return Promise.resolve(json(titlePayload));
      active += 1;
      max = Math.max(max, active);
      const count = JSON.parse(String(init?.body)).entries.length as number;
      return new Promise((resolve) => {
        release.push(() => {
          active -= 1;
          resolve(
            json({
              matches: Array.from({ length: count }, () => null),
            }),
          );
        });
      });
    };
    const sources = Array.from({ length: 31 }, (_, index) => ({
      name: `Film ${index}`,
      year: 2000,
    }));

    const pending = runImport(sources, { fetch: fetchImpl });
    await vi.waitFor(() => expect(release).toHaveLength(3));
    expect(max).toBe(3);
    for (const done of release.slice()) done();
    await vi.waitFor(() => expect(release).toHaveLength(4));
    const last = release[3];
    if (!last) throw new Error("missing batch");
    last();
    const rows = await pending;

    expect(rows).toHaveLength(31);
    expect(max).toBe(3);
  });

  it("loads at most eight titles at once", async () => {
    let active = 0;
    let max = 0;
    const release: Array<() => void> = [];
    const fetchImpl: typeof fetch = (input, init) => {
      if (String(input) === "/api/match") {
        const body = JSON.parse(String(init?.body)) as {
          entries: ImportSource[];
        };
        return Promise.resolve(
          json({
            matches: body.entries.map((_, index) => match(index + 1)),
          }),
        );
      }
      active += 1;
      max = Math.max(max, active);
      return new Promise((resolve) => {
        release.push(() => {
          active -= 1;
          resolve(json(titlePayload));
        });
      });
    };

    const pending = runImport(
      Array.from({ length: 10 }, (_, index) => ({
        name: `Film ${index}`,
        year: 2000,
      })),
      { fetch: fetchImpl },
    );
    await vi.waitFor(() => expect(release).toHaveLength(8));
    expect(max).toBe(8);
    for (const done of release.slice()) done();
    await vi.waitFor(() => expect(release).toHaveLength(10));
    for (const done of release.slice(8)) done();
    const rows = await pending;

    expect(rows).toHaveLength(10);
    expect(max).toBe(8);
  });

  it("pauses and retries a rate-limited batch", async () => {
    vi.useFakeTimers();
    let matchCalls = 0;
    const busy: number[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input) === "/api/match") {
        matchCalls += 1;
        if (matchCalls === 1) return json(errorBody("rate_limited"), 429);
        return json({ matches: [match(1)] });
      }
      return json(titlePayload);
    };

    const pending = runImport([{ name: "Heat", year: 1995 }], {
      fetch: fetchImpl,
      onBusy: () => busy.push(1),
    });
    await vi.advanceTimersByTimeAsync(2_000);
    const rows = await pending;

    expect(matchCalls).toBe(2);
    expect(busy).toHaveLength(1);
    expect(rows[0]?.match?.id).toBe(1);
  });

  it("stops retrying a rate-limited batch after three pauses", async () => {
    vi.useFakeTimers();
    let matchCalls = 0;
    const busy: number[] = [];
    const fetchImpl: typeof fetch = async () => {
      matchCalls += 1;
      return json(errorBody("rate_limited"), 429);
    };
    const pending = runImport([{ name: "Heat", year: 1995 }], {
      fetch: fetchImpl,
      onBusy: () => busy.push(1),
    });
    const settled = pending.then(
      () => null,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(8_000);
    const error = await settled;

    expect(error).toBeInstanceOf(ImportError);
    expect(error).toMatchObject({ code: "rate_limited" });
    expect(matchCalls).toBe(4);
    expect(busy).toHaveLength(3);
  });

  it("aborts while a batch is in flight", async () => {
    const controller = new AbortController();
    let started = 0;
    const fetchImpl: typeof fetch = (_input, init) => {
      started += 1;
      return new Promise((_resolve, reject) => {
        const abort = () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (init?.signal?.aborted) {
          abort();
          return;
        }
        init?.signal?.addEventListener("abort", abort, { once: true });
      });
    };
    const pending = runImport(
      Array.from({ length: 31 }, (_, index) => ({
        name: `Film ${index}`,
        year: 2000,
      })),
      { fetch: fetchImpl, signal: controller.signal },
    );
    const settled = pending.then(
      () => null,
      (error: unknown) => error,
    );

    await vi.waitFor(() => expect(started).toBe(3));
    controller.abort();
    await expect(settled).resolves.toMatchObject({ name: "AbortError" });
    expect(started).toBe(3);
  });

  it("aborts during the rate-limit pause", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchImpl: typeof fetch = async () =>
      json(errorBody("rate_limited"), 429);
    const pending = runImport([{ name: "Heat", year: 1995 }], {
      fetch: fetchImpl,
      signal: controller.signal,
    });
    const settled = pending.then(
      () => null,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(500);
    controller.abort();

    await expect(settled).resolves.toMatchObject({ name: "AbortError" });
  });

  it("keeps a matched title when availability keeps failing", async () => {
    vi.useFakeTimers();
    let titleCalls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input) === "/api/match") {
        return json({ matches: [match(7)] });
      }
      titleCalls += 1;
      return json(errorBody("upstream_unavailable"), 503);
    };
    const pending = runImport([{ name: "Heat", year: 1995 }], {
      fetch: fetchImpl,
    });

    await vi.advanceTimersByTimeAsync(8_000);
    const rows = await pending;

    expect(titleCalls).toBe(4);
    expect(rows[0]?.match).toMatchObject({ id: 7, availability: null });
  });
});

function fetchMatching(): typeof fetch {
  return async (input, init) => {
    if (String(input) !== "/api/match") return json(titlePayload);
    const body = JSON.parse(String(init?.body)) as {
      entries: Array<{ name: string; year: number | null }>;
    };
    return json({
      matches: body.entries.map((entry) => {
        if (entry.name === "Missing") return null;
        const digits = entry.name.match(/\d+/);
        const id = digits ? Number(digits[0]) + 1 : 1;
        return match(id, entry.name);
      }),
    });
  };
}

function match(id: number, title = "Heat") {
  return {
    kind: "movie" as const,
    id,
    title,
    year: 1995,
    posterPath: null,
    confidence: "exact" as const,
  };
}

function errorBody(code: string) {
  return { error: { code, message: code } };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
