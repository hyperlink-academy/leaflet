"use server";

import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { AtUri } from "@atproto/syntax";
import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { isAdminEmail } from "src/adminAllowlist";
import { getProfiles } from "src/identity";
import { restoreOAuthSession } from "src/atproto-oauth";
import { insertLeaflet } from "src/utils/insertLeaflet";
import { publishLeaflet } from "src/utils/publishLeaflet";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import type { PubLeafletPublication } from "lexicons/api";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import type { GhostPost } from "src/ghostImport/parseGhostExport";
import {
  planGhostDraft,
  draftFacts,
  previewImage,
  type GhostImportOptions,
} from "src/ghostImport/planDraft";
import type { ImportWarning } from "src/ghostImport/ghostToBlocks";
import { makeImageFetcher } from "src/ghostImport/uploadRemoteImage";

export type GhostImportError =
  | "unauthorized"
  | "invalid_input"
  | "publication_not_found"
  | "already_published"
  | "database_error";

export type GhostImportTarget = {
  uri: string;
  name: string;
  identity_did: string;
  handle: string | null;
  // The raw publication record, for theming the preview the way the live
  // site is themed.
  record: unknown;
  theme: PubLeafletPublication.Theme | null;
  newsletterEnabled: boolean;
  // Whether the owner's stored OAuth session can be restored — publishing
  // writes to their PDS, so without it only drafts can be created.
  ownerSessionOk: boolean;
  // rkeys of documents already published to this publication, so slug-keyed
  // imports can be detected before they'd overwrite anything.
  existingRkeys: string[];
};

async function getAdminIdentity() {
  let identity = await getAuthIdentity();
  if (!identity || !isAdminEmail(identity.email)) return null;
  return identity;
}

const MAX_SITE_URL_LENGTH = 2048;
function validOptions(o: GhostImportOptions): boolean {
  if (typeof o.siteUrl !== "string" || o.siteUrl.length > MAX_SITE_URL_LENGTH)
    return false;
  try {
    const u = new URL(o.siteUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return typeof o.gateMembersOnly === "boolean";
}

function validPost(p: GhostPost): boolean {
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.slug === "string" &&
    typeof p.title === "string" &&
    typeof p.html === "string" &&
    Array.isArray(p.tags)
  );
}

export async function getGhostImportTarget(
  publicationUri: string,
): Promise<Result<GhostImportTarget, GhostImportError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");
  if (!publicationUri.startsWith("at://")) return Err("invalid_input");

  let { data: pub, error } = await supabaseServerClient
    .from("publications")
    .select(
      "uri, name, identity_did, record, publication_newsletter_settings(enabled), documents_in_publications(document)",
    )
    .eq("uri", publicationUri)
    .maybeSingle();
  if (error) return Err("database_error");
  if (!pub) return Err("publication_not_found");

  let [profiles, session] = await Promise.all([
    getProfiles([pub.identity_did]),
    restoreOAuthSession(pub.identity_did),
  ]);
  let record = normalizePublicationRecord(pub.record);

  return Ok({
    uri: pub.uri,
    name: pub.name,
    identity_did: pub.identity_did,
    handle: profiles.get(pub.identity_did)?.handle ?? null,
    record: pub.record,
    theme: record?.theme ?? null,
    newsletterEnabled: !!pub.publication_newsletter_settings?.enabled,
    ownerSessionOk: session.ok,
    existingRkeys: (pub.documents_in_publications ?? []).map(
      (d) => new AtUri(d.document).rkey,
    ),
  });
}

export type GhostPostPreview = {
  // The draft exactly as importGhostPost would write it, with images left at
  // their Ghost URLs; the client renders it with the editor's block components.
  rootEntityId: string;
  firstPageId: string;
  facts: Fact<Attribute>[];
  blockCount: number;
  coverImageUrl: string | null;
  ghostId: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  warnings: ImportWarning[];
  imageCount: number;
};

export async function previewGhostImport(args: {
  posts: GhostPost[];
  options: GhostImportOptions;
}): Promise<Result<GhostPostPreview[], GhostImportError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");
  if (!validOptions(args.options) || !Array.isArray(args.posts))
    return Err("invalid_input");
  if (!args.posts.every(validPost)) return Err("invalid_input");

  let previews: GhostPostPreview[] = [];
  for (let post of args.posts) {
    let plan = planGhostDraft(post, args.options);
    let { facts } = draftFacts(plan, previewImage);
    previews.push({
      rootEntityId: plan.rootEntityId,
      firstPageId: plan.firstPageId,
      facts: facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
      blockCount: facts.filter(
        (f) => f.attribute === "card/block" && f.entity === plan.firstPageId,
      ).length,
      coverImageUrl: plan.coverImage?.url ?? null,
      ghostId: plan.ghostId,
      slug: plan.slug,
      title: plan.title,
      description: plan.description,
      tags: plan.tags,
      publishedAt: plan.publishedAt,
      warnings: plan.warnings,
      imageCount: plan.content.images.length + (plan.coverImage ? 1 : 0),
    });
  }
  return Ok(previews);
}

export type GhostImportMode = "draft" | "publish";

export type ImportedGhostPost = {
  ghostId: string;
  leafletId: string;
  title: string;
  rkey: string | null;
  documentUri: string | null;
  droppedImages: string[];
  warnings: ImportWarning[];
  // Set when the draft was created but publishing failed; the draft is left
  // in place so it can be published by hand.
  publishError: string | null;
};

// Record keys must be valid AT Protocol rkeys; Ghost slugs almost always are.
const RKEY_RE = /^[a-zA-Z0-9._:~-]{1,512}$/;
const validRkey = (s: string) => RKEY_RE.test(s) && s !== "." && s !== "..";

export async function importGhostPost(args: {
  post: GhostPost;
  publicationUri: string;
  options: GhostImportOptions;
  mode: GhostImportMode;
  useSlugAsRkey: boolean;
  showInDiscover: boolean;
}): Promise<Result<ImportedGhostPost, GhostImportError>> {
  let admin = await getAdminIdentity();
  if (!admin) return Err("unauthorized");
  if (
    !validOptions(args.options) ||
    !validPost(args.post) ||
    (args.mode !== "draft" && args.mode !== "publish") ||
    !args.publicationUri.startsWith("at://")
  )
    return Err("invalid_input");

  let { data: pub, error } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .eq("uri", args.publicationUri)
    .maybeSingle();
  if (error) return Err("database_error");
  if (!pub) return Err("publication_not_found");

  let plan = planGhostDraft(args.post, args.options);
  let warnings = [...plan.warnings];

  let rkey: string | undefined;
  if (args.mode === "publish" && args.useSlugAsRkey) {
    if (validRkey(plan.slug)) {
      rkey = plan.slug;
      // putRecord would silently overwrite an existing document at this key.
      let { data: existing } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .in("uri", [
          `at://${pub.identity_did}/site.standard.document/${rkey}`,
          `at://${pub.identity_did}/pub.leaflet.document/${rkey}`,
        ])
        .limit(1);
      if (existing && existing.length > 0) return Err("already_published");
    } else {
      warnings.push({
        kind: "slug_not_rkey",
        detail: `Slug "${plan.slug}" isn't a valid record key; a generated key is used instead`,
      });
    }
  }

  // Fetch every image before touching the database, so a draft never
  // references an upload that hasn't happened.
  let fetchImage = makeImageFetcher();
  let allImages = [
    ...plan.content.images,
    ...(plan.coverImage ? [plan.coverImage] : []),
  ];
  let uploaded = new Map(
    await Promise.all(
      allImages.map(
        async (img) => [img.entityID, await fetchImage(img.url)] as const,
      ),
    ),
  );

  let built = draftFacts(plan, (img) => uploaded.get(img.entityID) ?? null);
  let { permTokenId } = await insertLeaflet({
    rootEntityId: plan.rootEntityId,
    entityIds: built.entities,
    facts: built.facts,
    tailCte: ({ permTokenId }) => sql`, link AS (
      INSERT INTO leaflets_in_publications (publication, leaflet, doc, title, description, tags)
      VALUES (${args.publicationUri}, ${permTokenId}, NULL, ${plan.title}, ${plan.description},
        ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(plan.tags)}::jsonb)))
    )`,
  });

  let droppedImages = built.droppedImages.map((i) => i.url);
  for (let url of droppedImages)
    warnings.push({
      kind: "image_failed",
      detail: `Image could not be fetched and was dropped: ${url}`,
    });

  let result: ImportedGhostPost = {
    ghostId: plan.ghostId,
    leafletId: permTokenId,
    title: plan.title,
    rkey: null,
    documentUri: null,
    droppedImages,
    warnings,
    publishError: null,
  };
  if (args.mode !== "publish") return Ok(result);

  try {
    let published = await publishLeaflet({
      actorDid: pub.identity_did,
      root_entity: plan.rootEntityId,
      publication_uri: args.publicationUri,
      leaflet_id: permTokenId,
      title: plan.title,
      description: plan.description,
      tags: plan.tags,
      publishedAt: plan.publishedAt,
      // Imported posts are back-catalogue: never email subscribers about them.
      sendEmail: false,
      showInDiscover: args.showInDiscover,
      rkey,
    });
    if (!published.success) {
      result.publishError = published.error.message;
    } else {
      result.rkey = published.rkey;
      result.documentUri = `at://${pub.identity_did}/${published.record.$type}/${published.rkey}`;
    }
  } catch (e) {
    console.error("[admin/import-ghost] publish failed", e);
    result.publishError = e instanceof Error ? e.message : String(e);
  }
  return Ok(result);
}
