import type { MetadataRoute } from "next";

/** Shareable pages can be indexed. v1 does not publish a sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
