"use server";

import { v7 } from "uuid";
import { isValidRecordKey } from "@atproto/syntax";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { assertRkeyFree } from "src/utils/assertRkeyFree";
import { routeShape } from "src/utils/publishPublicationPages";
import {
  appendPublicationPage,
  publishImportedPages,
} from "src/import/importPage";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import type { GhostPost } from "src/ghostImport/parseGhostExport";
import {
  ghostPostToLeaflet,
  ghostPostToPage,
  type GhostLeaflet,
} from "src/ghostImport/ghostPostToLeaflet";
import { previewImage } from "src/import/leaflet";
import {
  findExistingImport,
  getImportPublication,
  imageUploader,
  insertImportedPost,
  skipPublished,
  type ImportedPostResult,
} from "src/import/importPost";

export type GhostPostPreview = GhostLeaflet & {
  // The draft exactly as importGhostPost would write it, with images left at
  // their Ghost URLs; the client renders it with the editor's block components.
  facts: Fact<Attribute>[];
};

export async function previewGhostImport(args: {
  post: GhostPost;
  siteUrl: string;
}): Promise<Result<GhostPostPreview, string>> {
  return asAdmin("import-ghost", async () => {
    let leaflet = await ghostPostToLeaflet(
      args.post,
      args.siteUrl,
      previewImage,
    );
    return {
      ...leaflet,
      facts: leaflet.facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
    };
  });
}

export type GhostImportMode = "draft" | "publish";
// Whether a published post keeps its Ghost slug as its record key or gets a
// fresh one. Pages always keep their slug: it's their route.
export type GhostPathMode = "source" | "leaflet";

export type GhostImportResult =
  | ({ kind: "post" } & ImportedPostResult)
  | { kind: "page"; route: string };

// Import one Ghost post as a draft in the publication (and, in publish mode,
// publish it as the owner under its Ghost slug; a post that fails to publish
// is left as a draft), or one Ghost page as a page in the publication's nav.
// Pages land in the publication's draft leaflet whatever the mode; publish
// mode publishes them all at once afterwards via publishGhostPages.
export async function importGhostPost(args: {
  post: GhostPost;
  publicationUri: string;
  siteUrl: string;
  mode: GhostImportMode;
  pathMode: GhostPathMode;
  showInDiscover: boolean;
}): Promise<Result<GhostImportResult, string>> {
  return asAdmin("import-ghost", async () => {
    let pub = await getImportPublication(args.publicationUri, args.mode);
    let slug = args.post.slug;
    let keepSlug = args.post.type === "page" || args.pathMode === "source";
    if (args.mode === "publish" && keepSlug && !isValidRecordKey(slug))
      throw new Error(`Slug "${slug}" is not a valid record key`);
    let existing = null;
    if (args.post.type !== "page") {
      let { title, description } = await ghostPostToLeaflet(
        args.post,
        args.siteUrl,
        previewImage,
      );
      existing = await findExistingImport({
        publication: pub,
        title,
        description,
        rkey: keepSlug ? slug : undefined,
      });
      let skipped = skipPublished(existing);
      if (skipped) return { kind: "post", ...skipped };
    }
    // Published pages take precedence over posts at the same /slug, so a
    // clash either way would hide one of them.
    if (keepSlug) await assertRkeyFree(pub.identity_did, slug);
    let resolveImage = imageUploader();

    if (args.post.type === "page") {
      let route = `/${slug}`;
      if (!routeShape.test(route))
        throw new Error(
          `Slug "${slug}" can't be a page path (lowercase letters, digits, and dashes only)`,
        );
      let page = await ghostPostToPage(args.post, args.siteUrl, resolveImage);
      await appendPublicationPage({ publication: pub, route, page });
      return { kind: "page", route };
    }

    let leaflet = await ghostPostToLeaflet(
      args.post,
      args.siteUrl,
      resolveImage,
    );
    let result = await insertImportedPost({
      leaflet,
      publication: pub,
      mode: args.mode,
      rkey: keepSlug ? slug : undefined,
      showInDiscover: args.showInDiscover,
      replaces: existing,
    });
    return { kind: "post", ...result };
  });
}

// Publish the publication's draft pages as the owner. This publishes the
// whole draft — imported pages along with any unpublished edits the owner
// had pending.
export async function publishGhostPages(args: {
  publicationUri: string;
}): Promise<Result<{ published: number }, string>> {
  return asAdmin("import-ghost", () =>
    publishImportedPages(args.publicationUri),
  );
}
