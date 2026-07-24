import type { NextRequest } from "next/server";

// req.url and req.nextUrl are normalized to the server's canonical origin — in
// dev that's http://localhost:3000 even when the browser is on 127.0.0.1
// (which the bsky oauth loopback redirect_uri requires). Auth cookies are
// host-scoped, so an absolute redirect built from them sends the user to
// localhost and strands the session there; build redirects from the Host
// header instead.
export function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("host");
  return host ? `${req.nextUrl.protocol}//${host}` : req.nextUrl.origin;
}
