import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseTitleRef, titleRedirectForPath } from "@/lib/title-ref";
import { lookupTitleName } from "@/lib/tmdb/lookup-title";

/**
 * Status codes have to be chosen before the page shell streams.
 * A wrong slug is 308. An unknown title is 404. A missing slug still renders.
 */
export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname
    .split("/")
    .filter((part) => part.length > 0);
  if (parts[0] !== "title" || parts.length < 3) return NextResponse.next();

  const kind = parts[1];
  const id = parts[2];
  if (!kind || !id) return NextResponse.next();
  const ref = parseTitleRef(kind, id);
  if (!ref) return notFound(request);

  const lookedUp = await lookupTitleName(ref.kind, ref.id);
  if (lookedUp === "missing") return notFound(request);
  if (typeof lookedUp !== "object") return NextResponse.next();

  const target = titleRedirectForPath(
    request.nextUrl.pathname,
    lookedUp.title,
    request.nextUrl.searchParams.get("view"),
  );
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 308);
}

function notFound(request: NextRequest) {
  return NextResponse.rewrite(request.nextUrl, { status: 404 });
}

export const config = {
  matcher: "/title/:path*",
};
