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

type ResolveImage = (image: ImportImage) => Promise<ImageData>;

// The entities and facts of one page's worth of content: the page entity, its
// blocks, and (for a Ghost page) the nav facts that make it a publication
// page at /slug.
export type GhostPage = {
  pageId: string;
  route: string;
  entities: string[];
  facts: LeafletFact[];
  coverImage: ImportImage | null;
  imageCount: number;
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

// Build a Ghost post or page as a single linear-document page. `resolveImage`
// decides where each image's bytes live (Ghost's own URL for a preview, a
// Leaflet upload for a real import).
//
// Posts Ghost restricted to members or paid tiers are placed entirely behind
// a members-only delimiter, unless a paywall card already marks where the
// public preview ends; their feature image is returned as the cover. Pages
// have neither: publication pages can't be gated, and a page's feature image
// becomes its first block.
export async function ghostPostToPage(
  post: GhostPost,
  siteUrl: string,
  resolveImage: ResolveImage,
): Promise<GhostPage> {
  const pageId = v7();
  const isPage = post.type === "page";
  const content = ghostHtmlToBlocks(post.html, { siteUrl, parent: pageId });
  if (
    !isPage &&
    post.visibility !== "public" &&
    !content.blocks.some((b) => b.type === "members-only-delimiter")
  ) {
    const entityID = v7();
    content.blocks.unshift({
      entityID,
      parent: pageId,
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

  const featureImage: ImportImage | null = post.featureImage
    ? {
        entityID: v7(),
        url: resolveGhostUrl(post.featureImage, siteUrl),
        width: null,
        height: null,
      }
    : null;
  if (featureImage && isPage) {
    content.blocks.unshift({
      entityID: featureImage.entityID,
      parent: pageId,
      type: "image",
      facts: [
        {
          entity: featureImage.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "image" },
        },
      ],
    });
    content.images.unshift(featureImage);
  }
  const coverImage = featureImage && !isPage ? featureImage : null;
  const images = [...content.images, ...(coverImage ? [coverImage] : [])];
  const resolved = await Promise.all(
    images.map(async (i) => [i.entityID, await resolveImage(i)] as const),
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
  for (const [entity, image] of resolved)
    facts.push({
      entity,
      attribute: "block/image",
      data: { type: "image", ...image },
    });
  const route = `/${post.slug}`;
  if (isPage)
    facts.push(
      {
        entity: pageId,
        attribute: "page/type",
        data: { type: "page-type-union", value: "doc" },
      },
      {
        entity: pageId,
        attribute: "page/route",
        data: { type: "string", value: route },
      },
      {
        entity: pageId,
        attribute: "page/title",
        data: { type: "string", value: post.title },
      },
    );

  return {
    pageId,
    route,
    entities: [
      pageId,
      ...content.blocks.map((b) => b.entityID),
      ...content.extraEntities,
      ...(coverImage ? [coverImage.entityID] : []),
    ],
    facts,
    coverImage,
    imageCount: images.length,
  };
}

// Wrap a page in a complete standalone leaflet: a root whose only page is the
// content, with a post's feature image as the cover. This is the shape a post
// is imported in, and the shape both posts and pages are previewed in.
export async function ghostPostToLeaflet(
  post: GhostPost,
  siteUrl: string,
  resolveImage: ResolveImage,
): Promise<GhostLeaflet> {
  const rootEntityId = v7();
  const page = await ghostPostToPage(post, siteUrl, resolveImage);
  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: page.pageId, position: "a0" },
    },
    ...page.facts,
  ];
  if (page.coverImage)
    facts.push({
      entity: rootEntityId,
      attribute: "root/cover-image",
      data: { type: "reference", value: page.coverImage.entityID },
    });

  return {
    rootEntityId,
    firstPageId: page.pageId,
    entities: [rootEntityId, ...page.entities],
    facts,
    ghostId: post.id,
    slug: post.slug,
    title: post.title,
    description: ghostExcerpt(post),
    tags: post.tags,
    publishedAt: post.publishedAt ?? post.createdAt,
    coverImageUrl: page.coverImage?.url ?? null,
    imageCount: page.imageCount,
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
