import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import type { LeafletFact } from "src/utils/insertLeaflet";
import { ghostHtmlToBlocks, type ImportImage } from "./ghostToBlocks";
import {
  ghostExcerpt,
  resolveGhostUrl,
  type GhostPost,
} from "./parseGhostExport";

export type ImageData = {
  src: string;
  width: number;
  height: number;
  fallback: string;
};

export type GhostLeaflet = {
  rootEntityId: string;
  firstPageId: string;
  entities: string[];
  facts: LeafletFact[];
  ghostId: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  coverImageUrl: string | null;
  imageCount: number;
};

// Convert a Ghost post into the entities and facts of a complete leaflet —
// root, one linear-document page, and its blocks. `resolveImage` decides where
// each image's bytes live (Ghost's own URL for a preview, a Leaflet upload for
// a real import). Posts Ghost restricted to members or paid tiers are placed
// entirely behind a members-only delimiter, unless a paywall card already
// marks where the public preview ends.
export async function ghostPostToLeaflet(
  post: GhostPost,
  siteUrl: string,
  resolveImage: (image: ImportImage) => Promise<ImageData>,
): Promise<GhostLeaflet> {
  const rootEntityId = v7();
  const firstPageId = v7();
  const content = ghostHtmlToBlocks(post.html, {
    siteUrl,
    parent: firstPageId,
  });
  if (
    post.visibility !== "public" &&
    !content.blocks.some((b) => b.type === "members-only-delimiter")
  ) {
    const entityID = v7();
    content.blocks.unshift({
      entityID,
      parent: firstPageId,
      type: "members-only-delimiter",
      facts: [
        {
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "members-only-delimiter" },
        },
      ],
    });
  }

  const coverImage: ImportImage | null = post.featureImage
    ? {
        entityID: v7(),
        url: resolveGhostUrl(post.featureImage, siteUrl),
        width: null,
        height: null,
      }
    : null;
  const images = [...content.images, ...(coverImage ? [coverImage] : [])];
  const resolved = await Promise.all(
    images.map(async (i) => [i.entityID, await resolveImage(i)] as const),
  );

  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: firstPageId, position: "a0" },
    },
  ];
  const topLevel = content.blocks.filter((b) => b.parent === firstPageId);
  const positions = generateNKeysBetween(null, null, topLevel.length);
  topLevel.forEach((b, i) =>
    facts.push({
      entity: firstPageId,
      attribute: "card/block",
      data: {
        type: "ordered-reference",
        value: b.entityID,
        position: positions[i],
      },
    }),
  );
  for (const b of content.blocks) facts.push(...b.facts);
  for (const [entity, image] of resolved)
    facts.push({
      entity,
      attribute: "block/image",
      data: { type: "image", ...image },
    });
  if (coverImage)
    facts.push({
      entity: rootEntityId,
      attribute: "root/cover-image",
      data: { type: "reference", value: coverImage.entityID },
    });

  return {
    rootEntityId,
    firstPageId,
    entities: [
      rootEntityId,
      firstPageId,
      ...content.blocks.map((b) => b.entityID),
      ...content.extraEntities,
      ...(coverImage ? [coverImage.entityID] : []),
    ],
    facts,
    ghostId: post.id,
    slug: post.slug,
    title: post.title,
    description: ghostExcerpt(post),
    tags: post.tags,
    publishedAt: post.publishedAt ?? post.createdAt,
    coverImageUrl: coverImage?.url ?? null,
    imageCount: images.length,
  };
}

// Images keep their Ghost URL and the intrinsic size Ghost rendered, so a
// preview needs no uploads.
export const previewImage = async (image: ImportImage): Promise<ImageData> => ({
  src: image.url,
  width: image.width ?? 1,
  height: image.height ?? 1,
  fallback: "",
});
