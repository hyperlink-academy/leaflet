import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { PubLeafletPublication, SiteStandardPublication } from "lexicons/api";
import { documentUriFilter } from "src/utils/uriHelpers";

export async function getPostPageData(did: string, rkey: string) {
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        uri,
        comments_on_documents(*, bsky_profiles(*)),
        documents_in_publications(publications(*,
          documents_in_publications(documents(uri, data)),
          publication_subscriptions(*))
        ),
        document_mentions_in_bsky(*),
        leaflets_in_publications(*)
        `,
    )
    .or(documentUriFilter(did, rkey))
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (!document) return null;

  // Normalize the document record - this is the primary way consumers should access document data
  const normalizedDocument = normalizeDocumentRecord(document.data, document.uri);
  if (!normalizedDocument) return null;

  // Normalize the publication record - this is the primary way consumers should access publication data
  const normalizedPublication = normalizePublicationRecord(
    document.documents_in_publications[0]?.publications?.record
  );

  // Fetch constellation backlinks for mentions
  let aturi = new AtUri(document.uri);
  const postUrl = normalizedPublication
    ? `${normalizedPublication.url}/${aturi.rkey}`
    : `https://leaflet.pub/p/${aturi.host}/${aturi.rkey}`;
  const constellationBacklinks = await getConstellationBacklinks(postUrl);

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

  let theme = normalizedPublication?.theme || normalizedDocument?.theme;

  // Calculate prev/next documents from the fetched publication documents
  let prevNext:
    | {
        prev?: { uri: string; title: string };
        next?: { uri: string; title: string };
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
        const normalizedData = normalizeDocumentRecord(dip?.documents?.data, dip?.documents?.uri);
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
    const currentIndex = sortedDocs.findIndex((doc) => doc.uri === document.uri);

    if (currentIndex !== -1) {
      prevNext = {
        prev:
          currentIndex > 0
            ? {
                uri: sortedDocs[currentIndex - 1].uri || "",
                title: sortedDocs[currentIndex - 1].title || "",
              }
            : undefined,
        next:
          currentIndex < sortedDocs.length - 1
            ? {
                uri: sortedDocs[currentIndex + 1].uri || "",
                title: sortedDocs[currentIndex + 1].title || "",
              }
            : undefined,
      };
    }
  }

  // Build explicit publication context for consumers
  const rawPub = document.documents_in_publications[0]?.publications;
  const publication = rawPub ? {
    uri: rawPub.uri,
    name: rawPub.name,
    identity_did: rawPub.identity_did,
    record: rawPub.record as PubLeafletPublication.Record | SiteStandardPublication.Record | null,
    publication_subscriptions: rawPub.publication_subscriptions || [],
  } : null;

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
    comments: document.comments_on_documents,
    mentions: document.document_mentions_in_bsky,
    leafletId: document.leaflets_in_publications[0]?.leaflet || null,
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
