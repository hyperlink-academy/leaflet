import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import { AtpAgent } from "@atproto/api";
import type { LeafletFact } from "src/utils/insertLeaflet";
import type { ImageData } from "src/ghostImport/ghostPostToLeaflet";
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
  type OffprintImage,
  type OffprintResolved,
} from "./offprintToBlocks";

type ResolveImage = (image: {
  entityID: string;
  url: string;
  width: number | null;
  height: number | null;
}) => Promise<ImageData>;

export type OffprintLeaflet = {
  rootEntityId: string;
  firstPageId: string;
  entities: string[];
  facts: LeafletFact[];
  sourceUri: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  coverImageUrl: string | null;
  imageCount: number;
};

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
  const rootEntityId = v7();
  const pageId = v7();
  const resolved = await resolveRefs(doc);
  const content = offprintContentToBlocks(doc.content.items ?? [], {
    parent: pageId,
    blobUrl: (cid) => blobUrl(source.pds, source.did, cid),
    resolved,
  });

  const coverCid = blobCid(doc.coverImage);
  const cover: OffprintImage | null = coverCid
    ? {
        entityID: v7(),
        url: blobUrl(source.pds, source.did, coverCid),
        width: null,
        height: null,
        attribute: "block/image",
      }
    : null;
  const images = [...content.images, ...(cover ? [cover] : [])];
  const uploaded = await Promise.all(
    images.map(async (i) => [i, await resolveImage(i)] as const),
  );

  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: pageId, position: "a0" },
    },
  ];
  const topLevel = content.blocks.filter((b) => b.parent === pageId);
  const positions = generateNKeysBetween(null, null, topLevel.length);
  topLevel.forEach((b, i) =>
    facts.push({
      entity: pageId,
      attribute: "card/block",
      data: {
        type: "ordered-reference",
        value: b.entityID,
        position: positions[i],
      },
    }),
  );
  for (const b of content.blocks) facts.push(...b.facts);
  for (const [image, data] of uploaded)
    facts.push({
      entity: image.entityID,
      attribute: image.attribute,
      data: { type: "image", ...data },
    });
  if (cover)
    facts.push({
      entity: rootEntityId,
      attribute: "root/cover-image",
      data: { type: "reference", value: cover.entityID },
    });

  return {
    rootEntityId,
    firstPageId: pageId,
    entities: [
      rootEntityId,
      pageId,
      ...content.blocks.map((b) => b.entityID),
      ...content.extraEntities,
      ...(cover ? [cover.entityID] : []),
    ],
    facts,
    sourceUri: source.uri,
    title: doc.title || "(Untitled)",
    description: doc.description?.trim() ?? "",
    tags: doc.tags ?? [],
    publishedAt: doc.publishedAt ?? new Date().toISOString(),
    coverImageUrl: cover?.url ?? null,
    imageCount: images.length,
  };
}
