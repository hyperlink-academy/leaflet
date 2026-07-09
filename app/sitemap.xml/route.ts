import { supabaseServerClient } from "supabase/serverClient";
import { isMainSiteHost } from "src/utils/customDomain";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: Request) {
  // Custom domains never reach this route (the middleware rewrites their
  // /sitemap.xml to the per-publication one); this index is the main site's.
  let host = req.headers.get("host");
  if (!host || !isMainSiteHost(host)) return new Response(null, { status: 404 });

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select("uri, record");

  // Every publication serves its own sitemap at the root of its domain
  // ({subdomain}.leaflet.pub or a BYO domain). Indexing them here gives
  // crawlers and Search Console (via a leaflet.pub domain property, which
  // covers all subdomains) one place to discover them all.
  let locs = new Set<string>();
  for (let pub of publications ?? []) {
    let url = getPublicationURL(pub);
    if (!url.startsWith("http")) continue;
    locs.add(url.replace(/\/+$/, "") + "/sitemap.xml");
  }

  let sitemaps = [...locs]
    .map((loc) => `<sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`)
    .join("");
  let body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      "CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
