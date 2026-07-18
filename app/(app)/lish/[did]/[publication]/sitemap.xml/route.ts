import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import {
  publicationNameOrUriFilter,
  publicationUriVariants,
} from "src/utils/uriHelpers";
import { dedupeDocumentsInPublications } from "src/utils/deduplicateRecords";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { isMainSiteHost } from "src/utils/customDomain";
import { isExternalLink } from "src/utils/externalPublicationLink";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizePath(path: string): string {
  return path[0] === "/" ? path : "/" + path;
}

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
  // Reaching this route means the middleware rewrote a custom-domain request to
  // /lish/{did}/{publication}/sitemap.xml. The host header is preserved across
  // the rewrite, so it's the domain the sitemap is being served on.
  let host = req.headers.get("host");
  if (!host || isMainSiteHost(host)) return new Response(null, { status: 404 });

  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select(`uri, publication_pages(path, record)`)
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);

  let publication = publications?.[0];
  if (!did || !publication) return new Response(null, { status: 404 });

  // Documents link to whichever namespace URI their record names, and the
  // publication may be indexed under both — fetch links for both variants so
  // legacy pub.leaflet-only posts still show up alongside migrated ones.
  let { data: docLinks } = await supabaseServerClient
    .from("documents_in_publications")
    .select("documents(uri, data, sort_date)")
    .in("publication", publicationUriVariants(publication.uri));

  let base = `https://${host}`;

  // Collect one entry per public URL, keyed by path so a post and a published
  // page (or the home page) at the same path don't appear twice.
  let entries = new Map<string, { loc: string; lastmod?: string }>();
  let add = (path: string, lastmod?: string) => {
    path = normalizePath(path);
    if (!entries.has(path)) entries.set(path, { loc: base + path, lastmod });
  };

  let posts = dedupeDocumentsInPublications(docLinks ?? []).map(
    (dip) => dip.documents,
  );

  // Home page lastmod tracks the most recently published post.
  let latest = posts.reduce<string | undefined>((acc, d) => {
    if (!d.sort_date) return acc;
    return !acc || d.sort_date > acc ? d.sort_date : acc;
  }, undefined);
  add("/", latest);

  for (let doc of posts) {
    let record = normalizeDocumentRecord(doc.data, doc.uri);
    let path = record?.path || "/" + new AtUri(doc.uri).rkey;
    add(path, doc.sort_date ?? record?.publishedAt ?? undefined);
  }

  for (let page of publication.publication_pages ?? []) {
    // External link tabs store a full URL in `path` and don't live on this
    // domain (see publishedPageMetadata).
    if (!page.path || isExternalLink(page.path)) continue;
    let record = page.record as { publishedAt?: string } | null;
    add(page.path, record?.publishedAt);
  }

  // The built-in archive route; content published at the /archive path was
  // already added above and keeps its own lastmod.
  add("/archive", latest);

  let urls = [...entries.values()]
    .map(({ loc, lastmod }) => {
      let lastmodTag = lastmod
        ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>`
        : "";
      return `<url><loc>${xmlEscape(loc)}</loc>${lastmodTag}</url>`;
    })
    .join("");

  let body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
      "CDN-Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
