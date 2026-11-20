"use client";

import { useSyncExternalStore } from "react";
import { heroImages } from "@/config/hero-images";

let picked: string | null | undefined;

function pickHero(): string | null {
  if (picked !== undefined) return picked;
  if (heroImages.length === 0) {
    picked = null;
    return picked;
  }
  const index = Math.floor(Math.random() * heroImages.length);
  picked = heroImages[index] ?? null;
  return picked;
}

/**
 * Decorative still above the desktop heading. The server renders the yellow
 * box only; a photo, if one is listed, is chosen after mount.
 */
export function HeroImage() {
  const src = useSyncExternalStore(
    () => () => {},
    pickHero,
    () => null,
  );

  return (
    <div
      aria-hidden="true"
      className="hidden h-hero w-hero shrink-0 overflow-hidden rounded-control bg-primary-300 md:block"
    >
      {src ? (
        // Local file. The blend treatment lives on `.hero-photo`.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={355}
          height={200}
          decoding="async"
          loading="lazy"
          className="hero-photo"
        />
      ) : null}
    </div>
  );
}
