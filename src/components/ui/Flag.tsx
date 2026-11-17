"use client";

import { useState } from "react";
import { flagPath } from "./flag-path";

/** Circular country flag. Decorative: the country name is the label. */
export function Flag({ code }: { code: string }) {
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const src = failedCode === code ? null : flagPath(code);

  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 overflow-hidden rounded-pill bg-primary-200"
    >
      {src ? (
        // The flag file is an SVG served from this app.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full"
          onError={() => setFailedCode(code)}
        />
      ) : null}
    </span>
  );
}
