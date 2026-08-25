"use server";

import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { isAdminEmail } from "src/adminAllowlist";
import { restoreOAuthSession } from "src/atproto-oauth";
import { insertLeaflet } from "src/utils/insertLeaflet";
import { publishLeaflet } from "src/utils/publishLeaflet";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import type { GhostPost } from "src/ghostImport/parseGhostExport";
import {
  ghostPostToLeaflet,
  previewImage,
  type GhostLeaflet,
} from "src/ghostImport/ghostPostToLeaflet";
import { uploadRemoteImage } from "src/ghostImport/uploadRemoteImage";

// Errors are returned as messages rather than thrown: Next redacts thrown
// server-action errors in production, and the admin needs the real reason.
async function asAdmin<T>(fn: () => Promise<T>): Promise<Result<T, string>> {
  let identity = await getAuthIdentity();
  if (!identity || !isAdminEmail(identity.email))
    return Err("You're not allowed to do that.");
  try {
    return Ok(await fn());
  } catch (e) {
    console.error("[admin/import-ghost]", e);
    return Err(e instanceof Error ? e.message : String(e));
  }
}

export type GhostPostPreview = GhostLeaflet & {
  // The draft exactly as importGhostPost would write it, with images left at
  // their Ghost URLs; the client renders it with the editor's block components.
  facts: Fact<Attribute>[];
};

export async function previewGhostImport(args: {
  post: GhostPost;
  siteUrl: string;
}): Promise<Result<GhostPostPreview, string>> {
  return asAdmin(async () => {
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

// Record keys must be valid AT Protocol rkeys; Ghost slugs almost always are.
const RKEY_RE = /^[a-zA-Z0-9._:~-]{1,512}$/;

// Import one post as a draft in the publication and, in publish mode, publish
// it as the owner under its Ghost slug. A post that fails to publish is left
// as a draft.
export async function importGhostPost(args: {
  post: GhostPost;
  publicationUri: string;
  siteUrl: string;
  mode: GhostImportMode;
  showInDiscover: boolean;
}): Promise<Result<{ leafletId: string; rkey: string | null }, string>> {
  return asAdmin(async () => {
    let { data: pub } = await supabaseServerClient
      .from("publications")
      .select("uri, identity_did")
      .eq("uri", args.publicationUri)
      .maybeSingle()
      .throwOnError();
    if (!pub) throw new Error("Publication not found");
    let rkey = args.post.slug;

    if (args.mode === "publish") {
      if (!RKEY_RE.test(rkey) || rkey === "." || rkey === "..")
        throw new Error(`Slug "${rkey}" is not a valid record key`);
      // putRecord would silently overwrite an existing document at this key.
      let { data: existing } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .in("uri", [
          `at://${pub.identity_did}/site.standard.document/${rkey}`,
          `at://${pub.identity_did}/pub.leaflet.document/${rkey}`,
        ])
        .throwOnError();
      if (existing && existing.length > 0)
        throw new Error(`A post with slug "${rkey}" is already published`);
      // Publishing writes to the owner's PDS with their stored session; check
      // it before creating a draft that couldn't be published.
      let session = await restoreOAuthSession(pub.identity_did);
      if (!session.ok) throw new Error(session.error.message);
    }

    // Fetch every image before touching the database, so a draft never
    // references an upload that hasn't happened.
    let cache = new Map<
      string,
      Promise<Awaited<ReturnType<typeof uploadRemoteImage>>>
    >();
    let leaflet = await ghostPostToLeaflet(args.post, args.siteUrl, (img) => {
      let p = cache.get(img.url) ?? uploadRemoteImage(img.url);
      cache.set(img.url, p);
      return p;
    });
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
      rkey,
    });
    if (!published.success)
      throw new Error(
        `Draft ${permTokenId} created but publishing failed: ${published.error.message}`,
      );
    return { leafletId: permTokenId, rkey: published.rkey };
  });
}
