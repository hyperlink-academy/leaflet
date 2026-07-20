import { isMainSiteHost } from "src/utils/customDomain";

export async function GET(req: Request) {
  // Reaching this route means the middleware rewrote a custom-domain request to
  // /lish/{did}/{publication}/robots.txt. The host header is preserved across
  // the rewrite, so it's the domain robots.txt is being served on.
  let host = req.headers.get("host");
  if (!host || isMainSiteHost(host)) return new Response(null, { status: 404 });

  let body = `User-agent: *
Allow: /

Sitemap: https://${host}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
      "CDN-Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
