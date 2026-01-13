import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";

export async function getPostPageData(uri: string) {
  let { data: document } = await supabaseServerClient
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
    .eq("uri", uri)
    .single();

  if (!document) return null;

  // Fetch constellation backlinks for mentions
  const pubRecord = document.documents_in_publications[0]?.publications
    ?.record as PubLeafletPublication.Record;
  let aturi = new AtUri(uri);
  const postUrl = pubRecord
    ? `https://${pubRecord?.base_path}/${aturi.rkey}`
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

  let theme =
    (
      document?.documents_in_publications[0]?.publications
        ?.record as PubLeafletPublication.Record
    )?.theme || (document?.data as PubLeafletDocument.Record)?.theme;

  // Calculate prev/next documents from the fetched publication documents
  let prevNext:
    | {
        prev?: { uri: string; title: string };
        next?: { uri: string; title: string };
      }
    | undefined;

  const currentPublishedAt = (document.data as PubLeafletDocument.Record)
    ?.publishedAt;
  const allDocs =
    document.documents_in_publications[0]?.publications
      ?.documents_in_publications;

  if (currentPublishedAt && allDocs) {
    // Filter and sort documents by publishedAt
    const sortedDocs = allDocs
      .map((dip) => ({
        uri: dip?.documents?.uri,
        title: (dip?.documents?.data as PubLeafletDocument.Record).title,
        publishedAt: (dip?.documents?.data as PubLeafletDocument.Record)
          .publishedAt,
      }))
      .filter((doc) => doc.publishedAt) // Only include docs with publishedAt
      .sort(
        (a, b) =>
          new Date(a.publishedAt!).getTime() -
          new Date(b.publishedAt!).getTime(),
      );

    // Find current document index
    const currentIndex = sortedDocs.findIndex((doc) => doc.uri === uri);

    if (currentIndex !== -1) {
      prevNext = {
        prev:
          currentIndex > 0
            ? {
                uri: sortedDocs[currentIndex - 1].uri || "",
                title: sortedDocs[currentIndex - 1].title,
              }
            : undefined,
        next:
          currentIndex < sortedDocs.length - 1
            ? {
                uri: sortedDocs[currentIndex + 1].uri || "",
                title: sortedDocs[currentIndex + 1].title,
              }
            : undefined,
      };
    }
  }

  return {
    ...document,
    quotesAndMentions,
    theme,
    prevNext,
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
