import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import {
  PubLeafletComment,
  PubLeafletPublication,
  SiteStandardPublication,
} from "lexicons/api";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { resolveDocumentFilter } from "../resolveDocumentFilter";

export async function getPostPageData(
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
        documents_in_publications(publications(*,
          documents_in_publications(documents(uri, data)),
          publication_subscriptions(*),
          publication_newsletter_settings(enabled),
          publication_pages(id, path, title, record_uri, sort_order))
        ),
        document_mentions_in_bsky(*),
        leaflets_in_publications(*),
        recommends_on_documents(count)
        `,
    )
    .or(filter)
    .order("uri", { ascending: false })
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

  // Fetch constellation backlinks for mentions
  const postUrl = getDocumentURL(normalizedDocument, document.uri, normalizedPublication);
  // Constellation needs an absolute URL
  const absolutePostUrl = postUrl.startsWith("/")
    ? `https://leaflet.pub${postUrl}`
    : postUrl;
  const constellationBacklinks = await getConstellationBacklinks(absolutePostUrl);

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
  let prevNext:
    | {
        prev?: { uri: string; title: string };
        next?: { uri: string; title: string };
        first?: { uri: string; title: string };
        last?: { uri: string; title: string };
      }
    | undefined;

  const currentPublishedAt = normalizedDocument.publishedAt;
  const allDocs =
    document.documents_in_publications[0]?.publications
      ?.documents_in_publications;

  if (currentPublishedAt && allDocs) {
    // Filter and sort documents by publishedAt
    const sortedDocs = allDocs
      .map((dip) => {
        const normalizedData = normalizeDocumentRecord(
          dip?.documents?.data,
          dip?.documents?.uri,
        );
        return {
          uri: dip?.documents?.uri,
          title: normalizedData?.title,
          publishedAt: normalizedData?.publishedAt,
        };
      })
      .filter((doc) => doc.publishedAt && doc.title) // Only include docs with publishedAt and valid data
      .sort(
        (a, b) =>
          new Date(a.publishedAt!).getTime() -
          new Date(b.publishedAt!).getTime(),
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
      };
    }
  }

  // Build explicit publication context for consumers
  const rawPub = document.documents_in_publications[0]?.publications;
  const publication = rawPub
    ? {
        uri: rawPub.uri,
        name: rawPub.name,
        identity_did: rawPub.identity_did,
        record: rawPub.record as
          | PubLeafletPublication.Record
          | SiteStandardPublication.Record
          | null,
        publication_subscriptions: rawPub.publication_subscriptions || [],
        newsletterMode: !!rawPub.publication_newsletter_settings?.enabled,
        pages: (rawPub.publication_pages || []).filter((p) => p.record_uri),
      }
    : null;
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
    ...document,
    // Pre-normalized data - consumers should use these instead of normalizing themselves
    normalizedDocument,
    normalizedPublication,
    quotesAndMentions,
    theme,
    prevNext,
    // Explicit relational data for DocumentContext
    publication,
    commentsCount,
    commentsCountByPage,
    mentions: document.document_mentions_in_bsky,
    leafletId: document.leaflets_in_publications[0]?.leaflet || null,
    // Recommends data
    recommendsCount,
  };
}

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
