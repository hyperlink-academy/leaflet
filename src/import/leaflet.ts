import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import type { LeafletFact } from "src/utils/insertLeaflet";
import type { ConvertedContent, ImportImage } from "./content";

export type ImageData = {
  src: string;
  width: number;
  height: number;
  fallback: string;
};

// Decides where an image's bytes live: the source's own URL for a preview, a
// Leaflet upload for a real import.
export type ResolveImage = (image: ImportImage) => Promise<ImageData>;

// Images keep their source URL and whatever intrinsic size the source stated,
// so a preview needs no uploads.
export const previewImage: ResolveImage = async (image) => ({
  src: image.url,
  width: image.width ?? 1,
  height: image.height ?? 1,
  fallback: "",
});

export type ImportedPage = {
  pageId: string;
  entities: string[];
  facts: LeafletFact[];
  cover: ImportImage | null;
  imageCount: number;
};

// A standalone leaflet holding one imported post, along with the publication
// metadata it is drafted and published under.
export type ImportedLeaflet = {
  rootEntityId: string;
  firstPageId: string;
  entities: string[];
  facts: LeafletFact[];
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  coverImageUrl: string | null;
  imageCount: number;
};

export function coverImage(url: string | null | undefined): ImportImage | null {
  return url ? { entityID: v7(), url, width: null, height: null } : null;
}

// The entities and facts of one linear-document page: its blocks in order and
// every image resolved. The cover isn't a block; its entity only carries the
// image for the leaflet root to reference.
export async function buildPage(
  pageId: string,
  content: ConvertedContent,
  cover: ImportImage | null,
  resolveImage: ResolveImage,
): Promise<ImportedPage> {
  const images = [...content.images, ...(cover ? [cover] : [])];
  const resolved = await Promise.all(
    images.map(async (i) => [i, await resolveImage(i)] as const),
  );

  const facts: LeafletFact[] = [];
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
  for (const [image, data] of resolved)
    facts.push({
      entity: image.entityID,
      attribute: image.attribute ?? "block/image",
      data: { type: "image", ...data },
    });

  return {
    pageId,
    entities: [
      pageId,
      ...content.blocks.map((b) => b.entityID),
      ...content.extraEntities,
      ...(cover ? [cover.entityID] : []),
    ],
    facts,
    cover,
    imageCount: images.length,
  };
}

// Wrap a page in a complete standalone leaflet: a root whose only page is the
// content, with the page's cover as the leaflet cover.
export function wrapInLeaflet(page: ImportedPage) {
  const rootEntityId = v7();
  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: page.pageId, position: "a0" },
    },
    ...page.facts,
  ];
  if (page.cover)
    facts.push({
      entity: rootEntityId,
      attribute: "root/cover-image",
      data: { type: "reference", value: page.cover.entityID },
    });
  return {
    rootEntityId,
    firstPageId: page.pageId,
    entities: [rootEntityId, ...page.entities],
    facts,
    coverImageUrl: page.cover?.url ?? null,
    imageCount: page.imageCount,
  };
}
