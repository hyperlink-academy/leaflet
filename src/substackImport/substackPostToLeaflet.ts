import { v7 } from "uuid";
import { gateContent } from "src/import/content";
import {
  buildPage,
  coverImage,
  wrapInLeaflet,
  type ImportedLeaflet,
  type ResolveImage,
} from "src/import/leaflet";
import type { SubstackPost } from "./parseSubstackExport";
import {
  substackFullSizeUrl,
  substackHtmlToBlocks,
  substackImageSource,
  substackPreviewUrl,
} from "./substackToBlocks";

export type SubstackLeaflet = ImportedLeaflet & {
  substackId: string;
  slug: string;
};

// Build a Substack post as a standalone leaflet. Posts for paid subscribers
// are placed entirely behind a members-only delimiter: the export doesn't
// say where their free preview ended.
export async function substackPostToLeaflet(
  post: SubstackPost,
  resolveImage: ResolveImage,
  opts: { rewriteLink?: (href: string) => string } = {},
): Promise<SubstackLeaflet> {
  const pageId = v7();
  const content = substackHtmlToBlocks(post.html, {
    parent: pageId,
    rewriteLink: opts.rewriteLink,
  });
  if (post.audience !== "everyone") gateContent(content, pageId);
  const page = await buildPage(
    pageId,
    content,
    coverImage(post.coverImage && substackImageSource(post.coverImage)),
    resolveImage,
  );
  return {
    ...wrapInLeaflet(page),
    substackId: post.id,
    slug: post.slug,
    title: post.title,
    description: post.subtitle,
    tags: post.tags,
    publishedAt: post.publishedAt ?? new Date().toISOString(),
  };
}

// A preview shows the CDN's page-size rendition rather than pulling down the
// originals. Where the source states no size (HEIC gallery images), a 4:3
// box stands in so the image is at least visible.
export const substackPreviewImage: ResolveImage = async (image) => ({
  src: substackPreviewUrl(image.url),
  width: image.width ?? 4,
  height: image.height ?? 3,
  fallback: "",
});

// Images uploaded before Substack moved buckets are no longer readable where
// they're stored (403), only through the CDN. When the original can't be
// fetched, take the CDN's full-size rendition instead.
export function withCdnFallback(resolveImage: ResolveImage): ResolveImage {
  return async (image) => {
    try {
      return await resolveImage(image);
    } catch (e) {
      const url = substackFullSizeUrl(image.url);
      if (url === image.url) throw e;
      return resolveImage({ ...image, url });
    }
  };
}

// Rewrites the author's links to their own Substack posts so they point at
// the imported copies, which keep their slugs.
export function substackLinkRewriter(siteUrl: string, publicationUrl: string) {
  const host = new URL(siteUrl).host;
  const base = publicationUrl.replace(/\/+$/, "");
  return (href: string) => {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return href;
    }
    const slug = /^\/p\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    return url.host === host && slug ? `${base}/${slug}${url.hash}` : href;
  };
}
