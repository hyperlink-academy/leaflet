import { v7 } from "uuid";
import { gateContent } from "src/import/content";
import {
  buildPage,
  coverImage,
  publicationPageFacts,
  wrapInLeaflet,
  type ImportedLeaflet,
  type ImportedPage,
  type ResolveImage,
} from "src/import/leaflet";
import type { WordpressPost } from "./parseWordpressExport";
import { wordpressExcerpt, wordpressHtmlToBlocks } from "./wordpressToBlocks";

export type WordpressLeaflet = ImportedLeaflet & {
  wordpressId: string;
  slug: string;
};

type Options = { rewriteLink?: (href: string) => string };

// One WordPress post or page as a linear-document page. Password-protected
// posts are placed entirely behind a members-only delimiter. A post's
// featured image becomes its cover; a page has no cover, so its featured
// image becomes its first block.
export async function wordpressPostToPage(
  post: WordpressPost,
  resolveImage: ResolveImage,
  opts: Options = {},
): Promise<ImportedPage & { route: string }> {
  const pageId = v7();
  const isPage = post.type === "page";
  const content = wordpressHtmlToBlocks(post.html, {
    parent: pageId,
    attachments: post.attachments,
    rewriteLink: opts.rewriteLink,
  });
  if (post.passwordProtected) {
    if (isPage)
      throw new Error("Password-protected pages can't be imported as pages");
    gateContent(content, pageId);
  }

  const feature = post.featureImage && {
    ...coverImage(post.featureImage.url)!,
    width: post.featureImage.width,
    height: post.featureImage.height,
  };
  if (feature && isPage) {
    content.blocks.unshift({
      entityID: feature.entityID,
      parent: pageId,
      type: "image",
      facts: [
        {
          entity: feature.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "image" },
        },
      ],
    });
    content.images.unshift(feature);
  }
  const page = await buildPage(
    pageId,
    content,
    isPage ? null : feature,
    resolveImage,
  );
  const route = `/${post.slug}`;
  if (isPage)
    page.facts.push(...publicationPageFacts(pageId, route, post.title));
  return { ...page, route };
}

export async function wordpressPostToLeaflet(
  post: WordpressPost,
  resolveImage: ResolveImage,
  opts: Options = {},
): Promise<WordpressLeaflet> {
  const page = await wordpressPostToPage(post, resolveImage, opts);
  return {
    ...wrapInLeaflet(page),
    wordpressId: post.id,
    slug: post.slug,
    title: post.title,
    description: wordpressExcerpt(post),
    tags: post.tags,
    publishedAt: post.date,
  };
}
