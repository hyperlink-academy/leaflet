import { isMainSiteHost } from "src/utils/customDomain";

export async function GET(req: Request) {
  // Reaching this route means the middleware rewrote a custom-domain request to
  // /lish/{did}/{publication}/robots.txt. The host header is preserved across
  // the rewrite, so it's the domain robots.txt is being served on.
  let host = req.headers.get("host");
  if (!host || isMainSiteHost(host)) return new Response(null, { status: 404 });

  // Keep crawlers out of the utility routes so they spend their budget on
  // content. Post paths are user-chosen, so short rules that could swallow a
  // real slug (/editorial, /subscriber-...) are anchored with $ / ? instead of
  // left as prefixes; crawlers without wildcard support skip those rules, and
  // the pages' robots noindex metadata still covers them.
  let body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /edit$
Disallow: /edit?
Disallow: /subscribe$
Disallow: /subscribe?
Disallow: /subscribeSuccess
Disallow: /theme-settings
Disallow: /contributor_accept

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
