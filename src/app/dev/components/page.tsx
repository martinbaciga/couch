import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

/**
 * Living style page. Hidden in production (the build renders a 404)
 * and omitted from the sitemap because no sitemap lists it.
 */
export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
