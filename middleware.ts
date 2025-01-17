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
  let { data: route } = await supabase
    .from("custom_domain_routes")
    .select("*")
    .eq("domain", hostname)
    .eq("route", req.nextUrl.pathname)
    .single();
  if (route)
    return NextResponse.rewrite(new URL(`/${route.permission_token}`, req.url));
}
