"use server";

import { AtUri, Agent, lexToJson } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

type ConstellationResponse = {
  records: { did: string; collection: string; rkey: string }[];
};

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

// Hydrate Bluesky URIs with post data
export async function hydrateBlueskyPosts(uris: string[]): Promise<PostView[]> {
  if (uris.length === 0) return [];

  let agent = new Agent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], {
        ...args[1],
        next: { revalidate: 3600 },
      }),
  });

  // Process URIs in batches of 25
  let allPostRequests = [];
  for (let i = 0; i < uris.length; i += 25) {
    let batch = uris.slice(i, i + 25);
    let batchPosts = agent.getPosts(
      {
        uris: batch,
      },
      { headers: {} },
    );
    allPostRequests.push(batchPosts);
  }
  let allPosts = (await Promise.all(allPostRequests)).flatMap(
    (r) => r.data.posts,
  );

  return lexToJson(allPosts) as PostView[];
}

// Legacy function - kept for backwards compatibility if needed
export async function getMentions(url: string) {
  let backlinks = await getConstellationBacklinks(url);
  let uris = backlinks.map((b) => b.uri);
  return hydrateBlueskyPosts(uris);
}
