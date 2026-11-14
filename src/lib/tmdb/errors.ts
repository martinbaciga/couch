export type ApiErrorCode =
  "not_found" | "rate_limited" | "upstream_unavailable" | "bad_request";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export class MissingTokenError extends Error {
  constructor() {
    super("TMDB_READ_ACCESS_TOKEN is not set");
    this.name = "MissingTokenError";
  }
}

export class RateLimitedError extends Error {
  constructor() {
    super("TMDB rate limit exceeded");
    this.name = "RateLimitedError";
  }
}

export class UpstreamError extends Error {
  readonly status: number;
  readonly timeout: boolean;

  constructor(status: number, options?: { timeout?: boolean }) {
    super(
      options?.timeout
        ? "TMDB request timed out"
        : `TMDB request failed with status ${status}`,
    );
    this.name = "UpstreamError";
    this.status = status;
    this.timeout = options?.timeout ?? false;
  }
}

const API_ERROR_STATUS: Record<
  "not_found" | "rate_limited" | "upstream_unavailable",
  number
> = {
  not_found: 404,
  rate_limited: 429,
  upstream_unavailable: 503,
};

export function toApiError(
  error: unknown,
): { status: number; body: ApiErrorBody } | null {
  const code = apiErrorCode(error);
  if (!code) return null;
  return {
    status: API_ERROR_STATUS[code],
    body: { error: { code, message: code } },
  };
}

function apiErrorCode(
  error: unknown,
): "not_found" | "rate_limited" | "upstream_unavailable" | null {
  if (error instanceof RateLimitedError) return "rate_limited";
  if (error instanceof MissingTokenError) return "upstream_unavailable";
  if (error instanceof UpstreamError) {
    return error.status === 404 ? "not_found" : "upstream_unavailable";
  }
  return null;
}
