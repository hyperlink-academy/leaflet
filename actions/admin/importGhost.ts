"use server";

import { v7 } from "uuid";
import { isValidRecordKey } from "@atproto/syntax";
import { generateKeyBetween } from "fractional-indexing";
import { supabaseServerClient } from "supabase/serverClient";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { appendToLeaflet } from "src/utils/insertLeaflet";
import { assertRkeyFree } from "src/utils/assertRkeyFree";
import {
  publishPublicationPages,
  routeShape,
} from "src/utils/publishPublicationPages";
import { readNavEntries } from "src/utils/publicationNavEntries";
import { createPublicationDraftLeaflet } from "actions/createPublicationDraftLeaflet";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
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
  getImportPublication,
  imageUploader,
  insertImportedPost,
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
  | { kind: "post"; leafletId: string; rkey: string | null }
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
      let pubRecord = normalizePublicationRecord(pub.record);
      let draftLeaflet =
        pub.draft_leaflet ??
        (await createPublicationDraftLeaflet({
          publication_uri: pub.uri,
          did: pub.identity_did,
          description: pubRecord?.description,
          theme: resolvePublicationTheme(pubRecord),
        }));
      let [{ data: token }, { data: rights }] = await Promise.all([
        supabaseServerClient
          .from("permission_tokens")
          .select("root_entity")
          .eq("id", draftLeaflet)
          .single()
          .throwOnError(),
        supabaseServerClient
          .from("permission_token_rights")
          .select("entity_set")
          .eq("token", draftLeaflet)
          .eq("write", true)
          .throwOnError(),
      ]);
      let entitySet = rights?.[0]?.entity_set;
      if (!token || !entitySet)
        throw new Error("Draft leaflet has no writable set");
      let rootEntity = token.root_entity;
      let { data: factData } = await supabaseServerClient
        .rpc("get_facts", { root: rootEntity })
        .throwOnError();
      let nav = readNavEntries(
        (factData as unknown as Fact<Attribute>[]) ?? [],
        rootEntity,
      );
      let clash = nav.find((e) => e.route === route);
      if (clash)
        throw new Error(
          `The publication already has a page at ${route} ("${clash.title}")`,
        );

      let page = await ghostPostToPage(args.post, args.siteUrl, resolveImage);
      await appendToLeaflet({
        entitySetId: entitySet,
        entityIds: page.entities,
        facts: [
          {
            entity: rootEntity,
            attribute: "root/page",
            data: {
              type: "ordered-reference",
              value: page.pageId,
              position: generateKeyBetween(nav.at(-1)?.position ?? null, null),
            },
          },
          ...page.facts,
        ],
      });
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
  return asAdmin("import-ghost", async () => {
    let { data: pub } = await supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("uri", args.publicationUri)
      .maybeSingle()
      .throwOnError();
    if (!pub) throw new Error("Publication not found");
    let result = await publishPublicationPages({
      publication_uri: args.publicationUri,
      actorDid: pub.identity_did,
    });
    if (!result.success) throw new Error(result.error.message);
    return { published: result.published.length };
  });
}
