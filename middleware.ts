import { NextRequest, NextResponse } from "next/server";

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

export default async function middleware(req: NextRequest) {
  let hostname = req.headers.get("host")!;
  if (hostname === "guilds.nyc")
    return NextResponse.rewrite(
      new URL("/b64bc712-c9c1-4ed3-a8f4-d33f33d3bfdb", req.url),
    );
}
