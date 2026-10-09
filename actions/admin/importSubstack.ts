"use server";

import { v7 } from "uuid";
import { isValidRecordKey } from "@atproto/syntax";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { assertRkeyFree } from "src/utils/assertRkeyFree";
import { getPublicationURL } from "src/utils/getPublicationURL";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  getImportPublication,
  imageUploader,
  insertImportedPost,
  type ImportMode,
} from "src/import/importPost";
import type { SubstackPost } from "src/substackImport/parseSubstackExport";
import {
  substackLinkRewriter,
  substackPostToLeaflet,
  substackPreviewImage,
  withCdnFallback,
  type SubstackLeaflet,
} from "src/substackImport/substackPostToLeaflet";
import { substackPreviewUrl } from "src/substackImport/substackToBlocks";
import {
  fetchSubstackMetadata,
  type SubstackPostMetadata,
} from "src/substackImport/substackSite";

// Cover images, tags, and excerpts for a Substack site's published posts,
// keyed by post id. The export has none of them.
export async function fetchSubstackPostMetadata(args: {
  siteUrl: string;
}): Promise<Result<Record<string, SubstackPostMetadata>, string>> {
  return asAdmin("import-substack", () => fetchSubstackMetadata(args.siteUrl));
}

export type SubstackPostPreview = SubstackLeaflet & {
  // The draft exactly as importSubstackPost would write it, with images left
  // on Substack's CDN; the client renders it with the editor's block
  // components.
  facts: Fact<Attribute>[];
};

export async function previewSubstackImport(args: {
  post: SubstackPost;
}): Promise<Result<SubstackPostPreview, string>> {
  return asAdmin("import-substack", async () => {
    let leaflet = await substackPostToLeaflet(args.post, substackPreviewImage);
    return {
      ...leaflet,
      coverImageUrl:
        leaflet.coverImageUrl && substackPreviewUrl(leaflet.coverImageUrl),
      facts: leaflet.facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
    };
  });
}

export type SubstackImportResult = { leafletId: string; rkey: string | null };

// Import one Substack post as a draft in the publication and, in publish
// mode, publish it as the owner. Posts that were drafts on Substack stay
// drafts whatever the mode.
export async function importSubstackPost(args: {
  post: SubstackPost;
  publicationUri: string;
  // The Substack site, when known: the author's links to their own posts
  // there are pointed at the imported copies.
  siteUrl: string | null;
  mode: ImportMode;
  pathMode: "source" | "leaflet";
  showInDiscover: boolean;
}): Promise<Result<SubstackImportResult, string>> {
  return asAdmin("import-substack", async () => {
    let { post } = args;
    let mode: ImportMode = post.isPublished ? args.mode : "draft";
    let pub = await getImportPublication(args.publicationUri, mode);
    let keepSlug = args.pathMode === "source";
    if (mode === "publish" && keepSlug) {
      if (!isValidRecordKey(post.slug))
        throw new Error(`Slug "${post.slug}" is not a valid record key`);
      await assertRkeyFree(pub.identity_did, post.slug);
    }

    let publicationUrl = getPublicationURL(pub);
    let resolveImage = withCdnFallback(imageUploader());
    let leaflet = await substackPostToLeaflet(post, resolveImage, {
      rewriteLink:
        keepSlug && args.siteUrl && /^https?:/.test(publicationUrl)
          ? substackLinkRewriter(args.siteUrl, publicationUrl)
          : undefined,
    });
    return insertImportedPost({
      leaflet,
      publication: pub,
      mode,
      rkey: keepSlug ? post.slug : undefined,
      showInDiscover: args.showInDiscover,
    });
  });
}
