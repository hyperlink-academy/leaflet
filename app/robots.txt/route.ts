import { isMainSiteHost, MAIN_SITE_URL } from "src/utils/customDomain";

export async function GET(req: Request) {
  // Custom domains never reach this route (the middleware rewrites their
  // /robots.txt to the per-publication one); this is the main site's.
  let host = req.headers.get("host");
  if (!host || !isMainSiteHost(host)) return new Response(null, { status: 404 });

  let body = `User-agent: *
Allow: /

Sitemap: ${MAIN_SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      "CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
