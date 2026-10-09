import { v7 } from "uuid";
import { AtpAgent } from "@atproto/api";
import {
  buildPage,
  coverImage,
  wrapInLeaflet,
  type ImportedLeaflet,
  type ResolveImage,
} from "src/import/leaflet";
import {
  blobCid,
  blobUrl,
  fetchOffprintComponent,
  OFFPRINT_CONTENT,
  type OffprintDocument,
} from "./offprintRecords";
import {
  collectOffprintRefs,
  offprintContentToBlocks,
  type OffprintResolved,
} from "./offprintToBlocks";

export type OffprintLeaflet = ImportedLeaflet & { sourceUri: string };

async function resolveRefs(doc: OffprintDocument): Promise<OffprintResolved> {
  const refs = collectOffprintRefs(doc.content.items ?? []);
  const components = new Map(
    await Promise.all(
      [...new Set(refs.components)].map(
        async (uri) =>
          [
            uri,
            (await fetchOffprintComponent(uri)).content.items ?? [],
          ] as const,
      ),
    ),
  );
  for (const items of components.values())
    refs.blueskyPosts.push(...collectOffprintRefs(items).blueskyPosts);
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  const blueskyThreads = new Map(
    await Promise.all(
      [...new Set(refs.blueskyPosts)].map(async (uri) => {
        const res = await agent.getPostThread({
          uri,
          depth: 0,
          parentHeight: 0,
        });
        // Strip the non-JSON bits (byte arrays) the client can't hold.
        return [uri, JSON.parse(JSON.stringify(res.data.thread))] as const;
      }),
    ),
  );
  return { components, blueskyThreads };
}

// Build an Offprint document as a standalone leaflet: a root whose only page
// holds the post's blocks, with the cover image as the leaflet cover.
// `resolveImage` decides where each image's bytes live (the PDS blob URL for
// a preview, a Leaflet upload for a real import).
export async function offprintDocToLeaflet(
  source: { uri: string; did: string; pds: string; doc: OffprintDocument },
  resolveImage: ResolveImage,
): Promise<OffprintLeaflet> {
  const { doc } = source;
  if (doc.content?.$type !== OFFPRINT_CONTENT)
    throw new Error(
      `Unsupported content type "${doc.content?.$type ?? "(none)"}"`,
    );
  const pageId = v7();
  const resolved = await resolveRefs(doc);
  const content = offprintContentToBlocks(doc.content.items ?? [], {
    parent: pageId,
    blobUrl: (cid) => blobUrl(source.pds, source.did, cid),
    resolved,
  });
  const coverCid = blobCid(doc.coverImage);
  const page = await buildPage(
    pageId,
    content,
    coverImage(coverCid && blobUrl(source.pds, source.did, coverCid)),
    resolveImage,
  );
  return {
    ...wrapInLeaflet(page),
    sourceUri: source.uri,
    title: doc.title || "(Untitled)",
    description: doc.description?.trim() ?? "",
    tags: doc.tags ?? [],
    publishedAt: doc.publishedAt ?? new Date().toISOString(),
  };
}
