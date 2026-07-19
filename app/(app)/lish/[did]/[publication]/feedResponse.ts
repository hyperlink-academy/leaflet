import { createHash } from "crypto";

const CACHE_HEADERS = {
  "Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
  "CDN-Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
};

// Feed readers poll relentlessly (rss out-requests every page on the site)
// and nearly all of them send If-None-Match — but transfer out is billed
// even on CDN cache hits, so serving the full document to every poll pays
// for the same unchanged bytes over and over. A content-derived ETag lets
// an unchanged feed answer with an empty 304 instead. `lastModified` (the
// newest post's date) covers the readers that only send If-Modified-Since.
export function feedResponse(
  req: Request,
  body: string,
  contentType: string,
  lastModified?: Date,
) {
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const lastModifiedHeader = lastModified
    ? { "Last-Modified": lastModified.toUTCString() }
    : undefined;
  const headers304 = { ETag: etag, ...lastModifiedHeader, ...CACHE_HEADERS };
  if (etagMatches(req.headers.get("if-none-match"), etag))
    return new Response(null, { status: 304, headers: headers304 });
  // Per RFC 9110 If-Modified-Since only applies when If-None-Match is absent.
  if (
    !req.headers.get("if-none-match") &&
    lastModified &&
    modifiedSince(req.headers.get("if-modified-since"), lastModified)
  )
    return new Response(null, { status: 304, headers: headers304 });
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      ETag: etag,
      ...lastModifiedHeader,
      ...CACHE_HEADERS,
    },
  });
}

function etagMatches(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  // Compare weakly: some readers echo the tag back with a W/ prefix.
  return ifNoneMatch
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .includes(etag);
}

function modifiedSince(ifModifiedSince: string | null, lastModified: Date) {
  if (!ifModifiedSince) return false;
  const since = new Date(ifModifiedSince).getTime();
  if (isNaN(since)) return false;
  // Compare at whole-second granularity — Last-Modified drops milliseconds,
  // so readers echo back a truncated timestamp.
  return Math.floor(lastModified.getTime() / 1000) <= Math.floor(since / 1000);
}
