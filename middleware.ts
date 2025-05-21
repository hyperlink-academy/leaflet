import { AtUri } from "@atproto/syntax";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "supabase/database.types";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
export default async function middleware(req: NextRequest) {
  let hostname = req.headers.get("host")!;
  if (hostname === "leaflet.pub") return;
  if (req.nextUrl.pathname === "/not-found") return;
  let { data: routes } = await supabase
    .from("custom_domains")
    .select(
      "*, custom_domain_routes(*), publication_domains(*, publications(*))",
    )
    .eq("domain", hostname)
    .single();

  let pub = routes?.publication_domains[0]?.publications;
  if (pub) {
    let aturi = new AtUri(pub?.uri);
    return NextResponse.rewrite(
      new URL(
        `/lish/${aturi.host}/${pub.name}${req.nextUrl.pathname}`,
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
