import { supabaseServerClient } from "supabase/serverClient";
import { isMainSiteHost } from "src/utils/customDomain";
import { getPublicationURL } from "src/utils/getPublicationURL";

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

  // Paginate below PostgREST's max_rows cap, which would otherwise silently
  // truncate the publication list.
  const pageSize = 1000;
  let publications: { uri: string; record: unknown }[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let { data } = await supabaseServerClient
      .from("publications")
      .select("uri, record")
      .order("uri")
      .range(offset, offset + pageSize - 1);
    publications = publications.concat(data ?? []);
    if (!data || data.length < pageSize) break;
  }

  // Every *.leaflet.pub publication serves its own sitemap at the root of its
  // subdomain. Indexing them here gives crawlers and Search Console (via a
  // leaflet.pub domain property, which covers all subdomains) one place to
  // discover them all. BYO domains are excluded: records self-report their
  // URL (live data includes third-party and malformed hosts), and Google
  // ignores cross-host index entries without Search Console verification
  // anyway — each BYO domain's own robots.txt Sitemap: line covers it.
  // Standalone /p/<did>/<rkey> docs aren't listed anywhere: crawlers reach an
  // author's newest posts through their profile page, and the rest are left
  // undiscoverable for now.
  let locs = new Set<string>();
  for (let pub of publications) {
    let url = getPublicationURL(pub);
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    if (!host.endsWith(".leaflet.pub")) continue;
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
