"use server";

import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { supabaseServerClient } from "supabase/serverClient";
import type { Result } from "src/result";
import { asAdmin } from "src/admin/asAdmin";
import { restoreOAuthSession } from "src/atproto-oauth";
import { insertLeaflet } from "src/utils/insertLeaflet";
import { publishLeaflet } from "src/utils/publishLeaflet";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { previewImage } from "src/ghostImport/ghostPostToLeaflet";
import { uploadRemoteImage } from "src/ghostImport/uploadRemoteImage";
import {
  fetchOffprintDocument,
  fetchOffprintPublication,
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

export type OffprintImportResult = { leafletId: string; rkey: string | null };

// Import one Offprint document as a draft in the publication and, in publish
// mode, publish it as the owner under a fresh record key (a post that fails
// to publish is left as a draft). The Offprint record itself is never
// touched: reusing its key would overwrite it when the owner imports into a
// Leaflet publication on the same account.
export async function importOffprintPost(args: {
  uri: string;
  publicationUri: string;
  mode: OffprintImportMode;
  showInDiscover: boolean;
}): Promise<Result<OffprintImportResult, string>> {
  return asAdmin("import-offprint", async () => {
    let { data: pub } = await supabaseServerClient
      .from("publications")
      .select("uri, identity_did")
      .eq("uri", args.publicationUri)
      .maybeSingle()
      .throwOnError();
    if (!pub) throw new Error("Publication not found");

    if (args.mode === "publish") {
      // Publishing writes to the owner's PDS with their stored session; check
      // it before creating a draft that couldn't be published.
      let session = await restoreOAuthSession(pub.identity_did);
      if (!session.ok) throw new Error(session.error.message);
    }

    let source = await fetchOffprintDocument(args.uri);
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

    // Fetch every image before touching the database, so a draft never
    // references an upload that hasn't happened.
    let cache = new Map<
      string,
      Promise<Awaited<ReturnType<typeof uploadRemoteImage>>>
    >();
    let resolveImage = (img: { url: string }) => {
      let p = cache.get(img.url) ?? uploadRemoteImage(img.url);
      cache.set(img.url, p);
      return p;
    };
    let leaflet = await offprintDocToLeaflet(
      { ...source, uri: args.uri },
      resolveImage,
    );

    let { permTokenId } = await insertLeaflet({
      rootEntityId: leaflet.rootEntityId,
      entityIds: leaflet.entities,
      facts: leaflet.facts,
      tailCte: ({ permTokenId }) => sql`, link AS (
        INSERT INTO leaflets_in_publications (publication, leaflet, doc, title, description, tags)
        VALUES (${args.publicationUri}, ${permTokenId}, NULL, ${leaflet.title}, ${leaflet.description},
          ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(leaflet.tags)}::jsonb)))
      )`,
    });
    if (args.mode !== "publish") return { leafletId: permTokenId, rkey: null };

    let published = await publishLeaflet({
      actorDid: pub.identity_did,
      root_entity: leaflet.rootEntityId,
      publication_uri: args.publicationUri,
      leaflet_id: permTokenId,
      title: leaflet.title,
      description: leaflet.description,
      tags: leaflet.tags,
      publishedAt: leaflet.publishedAt,
      // Imported posts are back-catalogue: never email subscribers about them.
      sendEmail: false,
      showInDiscover: args.showInDiscover,
    });
    if (!published.success)
      throw new Error(
        `Draft ${permTokenId} created but publishing failed: ${published.error.message}`,
      );
    return { leafletId: permTokenId, rkey: published.rkey };
  });
}
