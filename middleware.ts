import { AtUri } from "@atproto/syntax";
import { createClient } from "@supabase/supabase-js";
import { getCache } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "supabase/database.types";
import { isMainSiteHost } from "src/utils/customDomain";
import {
  receive_auth_callback_route,
  decryptCrossSiteToken,
} from "src/crossSiteAuth";

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
      "*, custom_domain_routes(*), publication_domains(*, publications(*))",
    )
    .eq("domain", hostname)
    .single();
  return data;
}
type DomainRoutes = Awaited<ReturnType<typeof getDomainRoutes>>;

export default async function middleware(req: NextRequest) {
  let hostname = req.headers.get("host")!;
  if (req.nextUrl.pathname === receive_auth_callback_route)
    return receiveAuthCallback(req);

  if (req.nextUrl.pathname === "/" && isMainSiteHost(hostname)) {
    let hasAuth =
      req.cookies.has("auth_token") || req.cookies.has("external_auth_token");
    if (hasAuth) {
      let navState = req.cookies.get("nav-state")?.value;
      let target = navState === "reader" ? "/reader" : "/home";
      return NextResponse.redirect(new URL(target, req.url));
    }
  }

  if (hostname === "leaflet.pub") return;
  if (req.nextUrl.pathname === "/not-found") return;
  let routes: DomainRoutes = null;
  try {
    routes = (await cache.get(`domain:${hostname}`)) as DomainRoutes;
  } catch {}
  if (!routes) {
    routes = await getDomainRoutes(hostname);
    if (routes) {
      try {
        await cache.set(`domain:${hostname}`, routes, {
          ttl: 60,
          tags: [`domain:${hostname}`],
        });
      } catch {}
    }
  }

  let pub = routes?.publication_domains[0]?.publications;
  if (pub) {
    if (req.nextUrl.pathname.startsWith("/lish")) return;
    let aturi = new AtUri(pub?.uri);
    return NextResponse.rewrite(
      new URL(
        `/lish/${aturi.host}/${aturi.rkey}${req.nextUrl.pathname}`,
        req.url,
      ),
    );
  }
  if (routes) {
    let route = routes.custom_domain_routes.find(
      (r) => r.route === req.nextUrl.pathname,
    );
    if (route)
      return NextResponse.rewrite(
        new URL(`/${route.view_permission_token}`, req.url),
      );
    else {
      return NextResponse.redirect(new URL("/not-found", req.url));
    }
  }
}

async function receiveAuthCallback(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("token");
  if (typeof token !== "string") return new NextResponse(null, { status: 401 });

  let payload = await decryptCrossSiteToken(token);
  if (!payload) return new NextResponse(null, { status: 401 });

  let url = new URL(payload.redirect);
  let response = NextResponse.redirect(url.toString());
  response.cookies.set("external_auth_token", payload.auth_token || "null");
  return response;
}
