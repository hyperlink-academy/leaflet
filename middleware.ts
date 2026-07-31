import { AtUri } from "@atproto/syntax";
import { createClient } from "@supabase/supabase-js";
import { getCache, waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "supabase/database.types";
import { isMainSiteHost } from "src/utils/customDomain";
import {
  receive_auth_callback_route,
  decryptCrossSiteToken,
} from "src/crossSiteAuth";
import { SESSION_MARKER_COOKIE } from "src/sessionMarker";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico) — except
     *    sitemap.xml and robots.txt, which custom-domain publications serve
     *    dynamically.
     */
    "/((?!api/|_next/|_static/|_vercel|(?!sitemap\\.xml|robots\\.txt)[\\w-]+\\.\\w+).*)",
  ],
};

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const cache = getCache();

async function getDomainRoutes(hostname: string) {
  let { data } = await supabase
    .from("custom_domains")
    .select(
      "domain, custom_domain_routes(route, view_permission_token), publication_domains(publications(uri))",
    )
    .eq("domain", hostname)
    .single();
  return data;
}
type DomainRoutes = Awaited<ReturnType<typeof getDomainRoutes>>;
type DomainCacheEntry = { routes: NonNullable<DomainRoutes>; cachedAt: number };

const DOMAIN_CACHE_TTL_SECONDS = 60 * 60 * 24;
const REVALIDATE_AFTER_MS = 60_000;

let inflightLookups = new Map<string, Promise<DomainRoutes>>();
function fetchDomainRoutesFromDB(hostname: string) {
  let pending = inflightLookups.get(hostname);
  if (!pending) {
    pending = getDomainRoutes(hostname).finally(() =>
      inflightLookups.delete(hostname),
    );
    inflightLookups.set(hostname, pending);
  }
  return pending;
}

async function writeDomainRoutesToCache(
  hostname: string,
  routes: DomainRoutes,
) {
  if (routes)
    await cache.set(
      `domain:${hostname}`,
      { routes, cachedAt: Date.now() } satisfies DomainCacheEntry,
      { ttl: DOMAIN_CACHE_TTL_SECONDS, tags: [`domain:${hostname}`] },
    );
  else await cache.delete(`domain:${hostname}`);
}

export default async function middleware(req: NextRequest) {
  let hostname = req.headers.get("host")!;
  if (req.nextUrl.pathname === receive_auth_callback_route)
    return receiveAuthCallback(req);

  // Older sessions may carry external_auth_token="null" (a literal string the
  // previous callback wrote for logged-out visitors) — not a session.
  let externalToken = req.cookies.get("external_auth_token")?.value;
  let hasAuth =
    req.cookies.has("auth_token") ||
    (!!externalToken && externalToken !== "null");
  // Sessions minted before the marker existed need it backfilled so published
  // pages know to fetch identity client-side.
  let backfillMarker = hasAuth && !req.cookies.has(SESSION_MARKER_COOKIE);
  let withMarker = (res?: NextResponse) => {
    if (!backfillMarker) return res;
    let out = res ?? NextResponse.next();
    out.cookies.set(SESSION_MARKER_COOKIE, "1", {
      // Match the lifetime of whichever cookie we're mirroring: external_auth_token
      // is a session cookie, so a persistent marker would outlive it and make
      // every published page view fetch an identity that no longer exists.
      ...(req.cookies.has("auth_token")
        ? { maxAge: 60 * 60 * 24 * 365 }
        : undefined),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    // The page behind this response may be a publicly-cached ISR entry; a
    // shared cache that stored this Set-Cookie would hand every anonymous
    // reader a session marker (and with it a per-view identity fetch). This
    // response fires once per legacy session, so making it uncacheable is
    // cheap insurance.
    out.headers.set("Cache-Control", "private, no-store");
    return out;
  };

  if (req.nextUrl.pathname === "/" && isMainSiteHost(hostname)) {
    if (hasAuth) {
      let navState = req.cookies.get("nav-state")?.value;
      let target = navState === "reader" ? "/reader" : "/home";
      return withMarker(NextResponse.redirect(new URL(target, req.url)));
    }
  }

  if (hostname === "leaflet.pub") return withMarker();
  if (req.nextUrl.pathname === "/not-found") return withMarker();
  let routes: DomainRoutes = null;
  let entry: DomainCacheEntry | null = null;
  try {
    entry = (await cache.get(`domain:${hostname}`)) as DomainCacheEntry | null;
  } catch {}
  if (entry?.routes) {
    routes = entry.routes;
    if (Date.now() - entry.cachedAt > REVALIDATE_AFTER_MS)
      waitUntil(
        fetchDomainRoutesFromDB(hostname)
          .then((fresh) => writeDomainRoutesToCache(hostname, fresh))
          .catch(() => {}),
      );
  } else {
    routes = await fetchDomainRoutesFromDB(hostname);
    if (routes)
      waitUntil(writeDomainRoutesToCache(hostname, routes).catch(() => {}));
  }

  let pub = routes?.publication_domains[0]?.publications;
  if (pub) {
    if (req.nextUrl.pathname.startsWith("/lish")) return withMarker();
    let aturi = new AtUri(pub?.uri);
    // Normalize the root path (no trailing slash) so the pub home shares one
    // cache entry with /lish/:did/:rkey.
    let path = req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname;
    return withMarker(
      NextResponse.rewrite(
        new URL(`/lish/${aturi.host}/${aturi.rkey}${path}`, req.url),
      ),
    );
  }
  if (routes) {
    let route = routes.custom_domain_routes.find(
      (r) => r.route === req.nextUrl.pathname,
    );
    if (route)
      return withMarker(
        NextResponse.rewrite(
          new URL(`/${route.view_permission_token}`, req.url),
        ),
      );
    else {
      return withMarker(NextResponse.redirect(new URL("/not-found", req.url)));
    }
  }
  return withMarker();
}

async function receiveAuthCallback(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("token");
  if (typeof token !== "string") return new NextResponse(null, { status: 401 });

  let payload = await decryptCrossSiteToken(token);
  if (!payload) return new NextResponse(null, { status: 401 });

  let url = new URL(payload.redirect);
  let response = NextResponse.redirect(url.toString());
  if (payload.auth_token) {
    response.cookies.set("external_auth_token", payload.auth_token);
    // Session-scoped to match external_auth_token above, which carries no
    // maxAge; a longer-lived marker would keep triggering identity fetches on
    // cacheable pages after the session cookie is gone.
    response.cookies.set(SESSION_MARKER_COOKIE, "1", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } else {
    // A literal "null" here would read as a live session forever — the cookie
    // existing is what auth checks test for.
    response.cookies.delete("external_auth_token");
    response.cookies.delete(SESSION_MARKER_COOKIE);
  }
  return response;
}
