import { cache } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import { PubLeafletComment } from "lexicons/api";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { getDocumentPages } from "src/utils/normalizeRecords";
import {
  postHasMembersDelimiter,
  truncatePagesAtMembersDelimiter,
} from "src/membership";
import {
  projectDocumentRowForClient,
  projectPublicationForClient,
} from "./postPageProjection";
import { resolveDocumentFilter } from "./resolveDocumentFilter";
import { getPostImagePreloads } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/getPostImagePreloads";

export const getPostPageData = cache(async function getPostPageData(
  did: string,
  rkey: string,
  publicationName?: string,
) {
  let filter = publicationName
    ? await resolveDocumentFilter(did, publicationName, rkey)
    : documentUriFilter(did, rkey);
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        uri,
        comments_on_documents(record),
        documents_in_publications(publications(uri, name, identity_did, record,
          documents_in_publications(documents(uri, sort_date, title:data->>title, publishedAt:data->>publishedAt)),
          publication_newsletter_settings(enabled),
          publication_membership_settings(enabled),
          publication_membership_tiers(id, name, description, monthly_price_cents, annual_price_cents, currency, active, sort_order, is_free))
        ),
        document_mentions_in_bsky(uri, link),
        recommends_on_documents(count)
        `,
    )
    .or(filter)
    .order("uri", { ascending: false })
    // A document can legally join two publications; without an embed order the
    // [0] pick is nondeterministic and could disagree with getUnlockedPost's.
    .order("publication", { referencedTable: "documents_in_publications" })
    .limit(1);
  let document = documents?.[0];

  if (!document) return null;

  // Normalize the document record - this is the primary way consumers should access document data
  const normalizedDocument = normalizeDocumentRecord(
    document.data,
    document.uri,
  );
  if (!normalizedDocument) return null;

  // Normalize the publication record - this is the primary way consumers should access publication data
  const normalizedPublication = normalizePublicationRecord(
    document.documents_in_publications[0]?.publications?.record,
  );

  // Members-only gating: when the publication has paid memberships enabled and
  // the post's first page carries a delimiter, drop everything after it before
  // the record leaves the server. This render is identity-free by construction
  // — every viewer gets the gated variant so the page stays cacheable — and
  // entitled readers unlock the tail client-side via getUnlockedPost.
  const gatePub = document.documents_in_publications[0]?.publications;
  const membershipTiers = (gatePub?.publication_membership_tiers ?? [])
    .filter((t) => t.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      monthly_price_cents: t.monthly_price_cents,
      annual_price_cents: t.annual_price_cents,
      currency: t.currency,
      is_free: t.is_free,
    }));
  let membersOnly: { gated: boolean; tiers: typeof membershipTiers } = {
    gated: false,
    tiers: [],
  };
  if (
    gatePub?.publication_membership_settings?.enabled &&
    postHasMembersDelimiter(normalizedDocument)
  ) {
    // normalizeDocumentRecord shares the pages array with `document.data`, so
    // this one splice gates both the normalized view and the raw record we
    // return. See the by-reference test in src/membership.test.ts.
    const pages = getDocumentPages(normalizedDocument);
    if (pages) truncatePagesAtMembersDelimiter(pages);
    membersOnly = { gated: true, tiers: membershipTiers };
  }

  // Fetch constellation backlinks for mentions
  const postUrl = getDocumentURL(
    normalizedDocument,
    document.uri,
    normalizedPublication,
  );
  // Constellation needs an absolute URL
  const absolutePostUrl = postUrl.startsWith("/")
    ? `https://leaflet.pub${postUrl}`
    : postUrl;
  const constellationBacklinks =
    await getConstellationBacklinks(absolutePostUrl);

  // Deduplicate constellation backlinks (same post could appear in both links and embeds)
  const uniqueBacklinks = Array.from(
    new Map(constellationBacklinks.map((b) => [b.uri, b])).values(),
  );

  // Combine database mentions (already deduplicated by DB constraint) and constellation backlinks
  const quotesAndMentions: { uri: string; link?: string }[] = [
    // Database mentions (quotes with link to quoted content)
    ...document.document_mentions_in_bsky.map((m) => ({
      uri: m.uri,
      link: m.link,
    })),
    // Constellation backlinks (direct post mentions without quote context)
    ...uniqueBacklinks,
  ];

  let theme =
    resolvePublicationTheme(normalizedPublication) || normalizedDocument?.theme;

  // Calculate prev/next documents from the fetched publication documents
  type Neighbour = { uri: string; title: string; images?: string[] };
  let prevNext:
    | {
        prev?: Neighbour;
        next?: Neighbour;
        first?: { uri: string; title: string };
        last?: { uri: string; title: string };
        // One hop further out each way, for route prefetch only
        prevPreload?: string;
        nextPreload?: string;
      }
    | undefined;

  const currentPublishedAt = normalizedDocument.publishedAt;
  const allDocs =
    document.documents_in_publications[0]?.publications
      ?.documents_in_publications;

  if (currentPublishedAt && allDocs) {
    // The publishedAt filter mirrors normalizeDocumentRecord's gating of
    // unpublished pub.leaflet records without paying for the full data jsonb
    // of every sibling post.
    const sortedDocs = allDocs
      .flatMap((dip) => (dip.documents ? [dip.documents] : []))
      .filter((doc) => doc.publishedAt && doc.title)
      .sort(
        (a, b) =>
          new Date(a.sort_date || 0).getTime() -
          new Date(b.sort_date || 0).getTime(),
      );

    // Find current document index
    const currentIndex = sortedDocs.findIndex(
      (doc) => doc.uri === document.uri,
    );

    if (currentIndex !== -1) {
      const lastIndex = sortedDocs.length - 1;
      prevNext = {
        prev:
          currentIndex > 0
            ? {
                uri: sortedDocs[currentIndex - 1].uri || "",
                title: sortedDocs[currentIndex - 1].title || "",
              }
            : undefined,
        next:
          currentIndex < lastIndex
            ? {
                uri: sortedDocs[currentIndex + 1].uri || "",
                title: sortedDocs[currentIndex + 1].title || "",
              }
            : undefined,
        first:
          currentIndex > 0
            ? {
                uri: sortedDocs[0].uri || "",
                title: sortedDocs[0].title || "",
              }
            : undefined,
        last:
          currentIndex < lastIndex
            ? {
                uri: sortedDocs[lastIndex].uri || "",
                title: sortedDocs[lastIndex].title || "",
              }
            : undefined,
        prevPreload:
          currentIndex > 1 ? sortedDocs[currentIndex - 2].uri || "" : undefined,
        nextPreload:
          currentIndex < lastIndex - 1
            ? sortedDocs[currentIndex + 2].uri || ""
            : undefined,
      };
    }
  }

  // Router prefetching covers the neighbours' markup but not their images, so
  // their art rides along in this page's own payload.
  if (
    prevNext &&
    gatePub &&
    (normalizedPublication?.preferences?.showPrevNext ?? true)
  ) {
    const warm = [prevNext.next, prevNext.prev].filter(
      (n): n is Neighbour => !!n,
    );
    const images = await getPostImagePreloads(
      warm.map((n) => n.uri),
      gatePub.uri,
    );
    for (const neighbour of warm) neighbour.images = images.get(neighbour.uri);
  }

  // Build explicit publication context for consumers
  const publication = projectPublicationForClient(
    document.documents_in_publications[0]?.publications,
  );
  const recommendsCount = document.recommends_on_documents?.[0]?.count ?? 0;

  // Comments are counted per-page so subpages (and the main page) each show only
  // their own discussion. Comments on the main page have no `onPage`, so they're
  // keyed under "". `commentsCount` remains the document-wide total.
  const commentRecords = document.comments_on_documents ?? [];
  const commentsCountByPage: Record<string, number> = {};
  for (const c of commentRecords) {
    const onPage = (c.record as PubLeafletComment.Record)?.onPage ?? "";
    commentsCountByPage[onPage] = (commentsCountByPage[onPage] ?? 0) + 1;
  }
  const commentsCount = commentRecords.length;

  return {
    // Allow-listed subset of the query result — see postPageProjection.ts. The
    // rest (sibling post records, comment records, the publication's membership
    // config) is server-only working data for the fields computed above.
    ...projectDocumentRowForClient(document),
    // Pre-normalized data - consumers should use these instead of normalizing themselves
    normalizedDocument,
    normalizedPublication,
    postUrl,
    quotesAndMentions,
    theme,
    prevNext,
    membersOnly,
    // Explicit relational data for DocumentContext
    publication,
    commentsCount,
    commentsCountByPage,
    mentions: document.document_mentions_in_bsky,
    // Recommends data
    recommendsCount,
  };
});

export type PostPageData = Awaited<ReturnType<typeof getPostPageData>>;

const headers = {
  "Content-type": "application/json",
  "user-agent": "leaflet.pub",
};

// Fetch constellation backlinks without hydrating with Bluesky post data
export async function getConstellationBacklinks(
  url: string,
): Promise<{ uri: string }[]> {
  try {
    let baseURL = `https://constellation.microcosm.blue/xrpc/blue.microcosm.links.getBacklinks?subject=${encodeURIComponent(url)}`;
    let externalEmbeds = new URL(
      `${baseURL}&source=${encodeURIComponent("app.bsky.feed.post:embed.external.uri")}`,
    );
    let linkFacets = new URL(
      `${baseURL}&source=${encodeURIComponent("app.bsky.feed.post:facets[].features[app.bsky.richtext.facet#link].uri")}`,
    );

    let [links, embeds] = (await Promise.all([
      fetch(linkFacets, { headers, next: { revalidate: 3600 } }).then((req) =>
        req.json(),
      ),
      fetch(externalEmbeds, { headers, next: { revalidate: 3600 } }).then(
        (req) => req.json(),
      ),
    ])) as ConstellationResponse[];

    let uris = [...links.records, ...embeds.records].map((i) =>
      AtUri.make(i.did, i.collection, i.rkey).toString(),
    );

    return uris.map((uri) => ({ uri }));
  } catch (e) {
    return [];
  }
}

type ConstellationResponse = {
  records: { did: string; collection: string; rkey: string }[];
};
