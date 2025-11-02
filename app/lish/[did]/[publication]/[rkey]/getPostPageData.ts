import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";

export async function getPostPageData(uri: string) {
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        uri,
        comments_on_documents(*, bsky_profiles(*)),
        documents_in_publications(publications(*, publication_subscriptions(*))),
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
  const rkey = new AtUri(uri).rkey;
  const postUrl = `https://${pubRecord?.base_path}/${rkey}`;
  const constellationBacklinks = await getConstellationBacklinks(postUrl);

  // Combine database mentions and constellation backlinks
  const quotesAndMentions: { uri: string; link?: string }[] = [
    // Database mentions (quotes with link to quoted content)
    ...document.document_mentions_in_bsky.map((m) => ({
      uri: m.uri,
      link: m.link,
    })),
    // Constellation backlinks (direct post mentions without quote context)
    ...constellationBacklinks,
  ];

  return {
    ...document,
    quotesAndMentions,
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
    fetch(externalEmbeds, { headers, next: { revalidate: 3600 } }).then((req) =>
      req.json(),
    ),
  ])) as ConstellationResponse[];

  let uris = [...links.records, ...embeds.records].map((i) =>
    AtUri.make(i.did, i.collection, i.rkey).toString(),
  );

  return uris.map((uri) => ({ uri }));
}

type ConstellationResponse = {
  records: { did: string; collection: string; rkey: string }[];
};
