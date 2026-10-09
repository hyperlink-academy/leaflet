import { v7 } from "uuid";
import { gateContent, type ImportImage } from "src/import/content";
import {
  buildPage,
  coverImage,
  wrapInLeaflet,
  type ImportedLeaflet,
  type ResolveImage,
} from "src/import/leaflet";
import type { LeafletFact } from "src/utils/insertLeaflet";
import { ghostHtmlToBlocks } from "./ghostToBlocks";
import {
  ghostExcerpt,
  resolveGhostUrl,
  type GhostPost,
} from "./parseGhostExport";

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

export type GhostLeaflet = ImportedLeaflet & { ghostId: string; slug: string };

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
  if (!isPage && post.visibility !== "public") gateContent(content, pageId);

  const featureImage = coverImage(
    post.featureImage && resolveGhostUrl(post.featureImage, siteUrl),
  );
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
  const page = await buildPage(
    pageId,
    content,
    isPage ? null : featureImage,
    resolveImage,
  );
  const facts = page.facts;
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
    entities: page.entities,
    facts,
    coverImage: page.cover,
    imageCount: page.imageCount,
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
  const page = await ghostPostToPage(post, siteUrl, resolveImage);
  return {
    ...wrapInLeaflet({ ...page, cover: page.coverImage }),
    ghostId: post.id,
    slug: post.slug,
    title: post.title,
    description: ghostExcerpt(post),
    tags: post.tags,
    publishedAt: post.publishedAt ?? post.createdAt,
  };
}
