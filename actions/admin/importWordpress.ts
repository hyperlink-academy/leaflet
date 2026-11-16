"use server";

import { v7 } from "uuid";
import { isValidRecordKey } from "@atproto/syntax";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { assertRkeyFree } from "src/utils/assertRkeyFree";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { routeShape } from "src/utils/publishPublicationPages";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { previewImage } from "src/import/leaflet";
import {
  getImportPublication,
  imageUploader,
  insertImportedPost,
  type ImportMode,
} from "src/import/importPost";
import {
  appendPublicationPage,
  publishImportedPages,
} from "src/import/importPage";
import type { WordpressPost } from "src/wordpressImport/parseWordpressExport";
import { wordpressLinkRewriter } from "src/wordpressImport/wordpressLinks";
import {
  wordpressPostToLeaflet,
  wordpressPostToPage,
  type WordpressLeaflet,
} from "src/wordpressImport/wordpressPostToLeaflet";

export type WordpressPostPreview = WordpressLeaflet & {
  // The draft exactly as importWordpressPost would write it, with images
  // left on the WordPress site; the client renders it with the editor's
  // block components.
  facts: Fact<Attribute>[];
};

export async function previewWordpressImport(args: {
  post: WordpressPost;
}): Promise<Result<WordpressPostPreview, string>> {
  return asAdmin("import-wordpress", async () => {
    let leaflet = await wordpressPostToLeaflet(args.post, previewImage);
    return {
      ...leaflet,
      facts: leaflet.facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
    };
  });
}

export type WordpressImportResult =
  | { kind: "post"; leafletId: string; rkey: string | null }
  | { kind: "page"; route: string };

// Import one WordPress post as a draft in the publication (and, in publish
// mode, publish it as the owner; a post that fails to publish is left as a
// draft), or one WordPress page as a page in the publication's nav. Posts
// that weren't published on WordPress stay drafts whatever the mode. Pages
// land in the publication's draft leaflet; publish mode publishes them all
// at once afterwards via publishWordpressPages.
export async function importWordpressPost(args: {
  post: WordpressPost;
  publicationUri: string;
  // The selected posts' links, from wordpressPermalinks: the author's links
  // between them are pointed at the imported copies.
  permalinks: Record<string, string>;
  mode: ImportMode;
  pathMode: "source" | "leaflet";
  showInDiscover: boolean;
}): Promise<Result<WordpressImportResult, string>> {
  return asAdmin("import-wordpress", async () => {
    let { post } = args;
    let isPage = post.type === "page";
    if (isPage && args.mode === "publish" && post.status !== "publish")
      throw new Error(
        `This page is ${post.status} on WordPress; import it as a draft instead`,
      );
    let mode: ImportMode = post.status === "publish" ? args.mode : "draft";
    let pub = await getImportPublication(args.publicationUri, mode);
    let slug = post.slug;
    let keepSlug = isPage || args.pathMode === "source";
    if (mode === "publish" && keepSlug && !isValidRecordKey(slug))
      throw new Error(`Slug "${slug}" is not a valid record key`);
    // Published pages take precedence over posts at the same /slug, so a
    // clash either way would hide one of them.
    if (keepSlug) await assertRkeyFree(pub.identity_did, slug);

    let publicationUrl = getPublicationURL(pub);
    let opts = {
      resolveImage: imageUploader(),
      rewriteLink:
        args.pathMode === "source" && /^https?:/.test(publicationUrl)
          ? wordpressLinkRewriter(args.permalinks, publicationUrl)
          : undefined,
    };

    if (isPage) {
      let route = `/${slug}`;
      if (!routeShape.test(route))
        throw new Error(
          `Slug "${slug}" can't be a page path (lowercase letters, digits, and dashes only)`,
        );
      let page = await wordpressPostToPage(post, opts.resolveImage, opts);
      await appendPublicationPage({ publication: pub, route, page });
      return { kind: "page", route };
    }

    let leaflet = await wordpressPostToLeaflet(post, opts.resolveImage, opts);
    let result = await insertImportedPost({
      leaflet,
      publication: pub,
      mode,
      rkey: keepSlug ? slug : undefined,
      showInDiscover: args.showInDiscover,
    });
    return { kind: "post", ...result };
  });
}

// Publish the publication's draft pages as the owner. This publishes the
// whole draft — imported pages along with any unpublished edits the owner
// had pending.
export async function publishWordpressPages(args: {
  publicationUri: string;
}): Promise<Result<{ published: number }, string>> {
  return asAdmin("import-wordpress", () =>
    publishImportedPages(args.publicationUri),
  );
}
