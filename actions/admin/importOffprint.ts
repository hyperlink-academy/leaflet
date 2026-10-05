"use server";

import { v7 } from "uuid";
import { supabaseServerClient } from "supabase/serverClient";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { assertRkeyFree } from "src/utils/assertRkeyFree";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { previewImage } from "src/import/leaflet";
import {
  getImportPublication,
  imageUploader,
  insertImportedPost,
} from "src/import/importPost";
import {
  fetchOffprintDocument,
  fetchOffprintPublication,
  offprintPathRkey,
  type OffprintPublication,
} from "src/offprintImport/offprintRecords";
import {
  offprintDocToLeaflet,
  type OffprintLeaflet,
} from "src/offprintImport/offprintDocToLeaflet";

export type {
  OffprintPost,
  OffprintPublication,
} from "src/offprintImport/offprintRecords";

// Look up an Offprint publication on its owner's PDS and list the documents
// published under it.
export async function listOffprintPosts(args: {
  publicationUri: string;
}): Promise<Result<OffprintPublication, string>> {
  return asAdmin("import-offprint", () =>
    fetchOffprintPublication(args.publicationUri),
  );
}

export type OffprintPostPreview = OffprintLeaflet & {
  // The draft exactly as importOffprintPost would write it, with images left
  // at their PDS blob URLs; the client renders it with the editor's block
  // components.
  facts: Fact<Attribute>[];
};

export async function previewOffprintImport(args: {
  uri: string;
}): Promise<Result<OffprintPostPreview, string>> {
  return asAdmin("import-offprint", async () => {
    let source = await fetchOffprintDocument(args.uri);
    let leaflet = await offprintDocToLeaflet(
      { ...source, uri: args.uri },
      previewImage,
    );
    return {
      ...leaflet,
      facts: leaflet.facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
    };
  });
}

export type OffprintImportMode = "draft" | "publish";
// Whether a published post keeps the last segment of its Offprint path as
// its record key or gets a fresh one.
export type OffprintPathMode = "source" | "leaflet";

export type OffprintImportResult = { leafletId: string; rkey: string | null };

// Import one Offprint document as a draft in the publication and, in publish
// mode, publish it as the owner (a post that fails to publish is left as a
// draft). The Offprint record itself is never touched: reusing its key would
// overwrite it when the owner imports into a Leaflet publication on the same
// account.
export async function importOffprintPost(args: {
  uri: string;
  publicationUri: string;
  mode: OffprintImportMode;
  pathMode: OffprintPathMode;
  showInDiscover: boolean;
}): Promise<Result<OffprintImportResult, string>> {
  return asAdmin("import-offprint", async () => {
    let pub = await getImportPublication(args.publicationUri, args.mode);

    let source = await fetchOffprintDocument(args.uri);
    let rkey =
      args.pathMode === "source"
        ? offprintPathRkey(source.doc.path)
        : undefined;
    if (rkey && pub.identity_did === source.did && rkey === source.rkey)
      throw new Error(
        `Publishing at /${rkey} would overwrite the Offprint record itself`,
      );
    if (rkey && args.mode === "publish")
      await assertRkeyFree(pub.identity_did, rkey);
    // Nothing ties a draft back to its source record, so a re-run would
    // duplicate every post; the title is the best available guard.
    let { data: existing } = await supabaseServerClient
      .from("leaflets_in_publications")
      .select("leaflet")
      .eq("publication", args.publicationUri)
      .eq("title", source.doc.title)
      .limit(1)
      .throwOnError();
    if (existing && existing.length > 0)
      throw new Error(
        `The publication already has a draft or post titled "${source.doc.title}"`,
      );

    let leaflet = await offprintDocToLeaflet(
      { ...source, uri: args.uri },
      imageUploader(),
    );
    return insertImportedPost({
      leaflet,
      publication: pub,
      mode: args.mode,
      rkey,
      showInDiscover: args.showInDiscover,
    });
  });
}
