import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "supabase/pool";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { restoreOAuthSession } from "src/atproto-oauth";
import { insertLeaflet } from "src/utils/insertLeaflet";
import { publishLeaflet } from "src/utils/publishLeaflet";
import type { ImportedLeaflet, ImageData, ResolveImage } from "./leaflet";
import { uploadRemoteImage } from "./uploadRemoteImage";

export type ImportMode = "draft" | "publish";

export async function getImportPublication(
  publicationUri: string,
  mode: ImportMode,
) {
  let { data: pub } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did, record, draft_leaflet")
    .eq("uri", publicationUri)
    .maybeSingle()
    .throwOnError();
  if (!pub) throw new Error("Publication not found");
  if (mode === "publish") {
    // Publishing writes to the owner's PDS with their stored session; check
    // it before creating a draft that couldn't be published.
    let session = await restoreOAuthSession(pub.identity_did);
    if (!session.ok) throw new Error(session.error.message);
  }
  return pub;
}

const UPLOAD_CONCURRENCY = 4;

// Copies each distinct image into Leaflet storage once. Every image is
// resolved before the importer touches the database, so a draft never
// references an upload that hasn't happened. Uploads are throttled because a
// post's originals can run to tens of megabytes each.
export function imageUploader(): ResolveImage {
  let cache = new Map<string, Promise<ImageData>>();
  let active = 0;
  let waiting: Array<() => void> = [];
  let throttled = async (url: string) => {
    if (active >= UPLOAD_CONCURRENCY)
      await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await uploadRemoteImage(url);
    } finally {
      let next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
  return (img) => {
    let p = cache.get(img.url) ?? throttled(img.url);
    cache.set(img.url, p);
    return p;
  };
}

// Insert an imported post as a draft in the publication and, in publish mode,
// publish it as the owner, backdated to its original date. A post that fails
// to publish is left as a draft.
export async function insertImportedPost(args: {
  leaflet: ImportedLeaflet;
  publication: { uri: string; identity_did: string };
  mode: ImportMode;
  rkey: string | undefined;
  showInDiscover: boolean;

  replaces?: ExistingImport | null;
}): Promise<ImportedPostResult> {
  let { leaflet, publication } = args;
  let { permTokenId } = await insertLeaflet({
    rootEntityId: leaflet.rootEntityId,
    entityIds: leaflet.entities,
    facts: leaflet.facts,
    tailCte: ({ permTokenId }) => sql`, link AS (
      INSERT INTO leaflets_in_publications (publication, leaflet, doc, title, description, tags)
      VALUES (${publication.uri}, ${permTokenId}, NULL, ${leaflet.title}, ${leaflet.description},
        ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(leaflet.tags)}::jsonb)))
    )`,
  });
  if (args.replaces)
    await deleteUnpublishedDraft(publication.uri, args.replaces.leafletId);
  let existing = args.replaces ? ({ existing: "draft" } as const) : {};
  if (args.mode !== "publish")
    return { leafletId: permTokenId, rkey: null, ...existing };

  let published = await publishLeaflet({
    actorDid: publication.identity_did,
    root_entity: leaflet.rootEntityId,
    publication_uri: publication.uri,
    leaflet_id: permTokenId,
    title: leaflet.title,
    description: leaflet.description,
    tags: leaflet.tags,
    publishedAt: leaflet.publishedAt,
    // Imported posts are back-catalogue: never email subscribers about them.
    sendEmail: false,
    showInDiscover: args.showInDiscover,
    rkey: args.rkey,
  });
  if (!published.success)
    throw new Error(
      `Draft ${permTokenId} created but publishing failed: ${published.error.message}`,
    );
  return { leafletId: permTokenId, rkey: published.rkey, ...existing };
}

async function deleteUnpublishedDraft(
  publicationUri: string,
  leafletId: string,
) {
  const client = await pool.connect();
  try {
    await drizzle(client).transaction(async (tx) => {
      let { rows } = await tx.execute<{
        root_entity: string;
        entity_set: string;
      }>(sql`
        SELECT pt.root_entity, ptr.entity_set
        FROM permission_tokens pt
        JOIN permission_token_rights ptr ON ptr.token = pt.id AND ptr.write
        JOIN leaflets_in_publications lip ON lip.leaflet = pt.id
        WHERE pt.id = ${leafletId}
          AND lip.publication = ${publicationUri}
          AND lip.doc IS NULL
      `);
      let draft = rows[0];
      if (!draft) return;
      await tx.execute(sql`
        INSERT INTO blob_cleanup_queue (path)
        SELECT DISTINCT split_part(split_part(data->>'src', '?', 1), '/', -1)
        FROM get_facts(${draft.root_entity})
        WHERE data->>'type' = 'image' AND data ? 'src'
        ON CONFLICT DO NOTHING
      `);
      await tx.execute(
        sql`DELETE FROM entities WHERE set = ${draft.entity_set}`,
      );
      await tx.execute(
        sql`DELETE FROM permission_tokens WHERE id = ${leafletId}`,
      );
    });
  } finally {
    client.release();
  }
}

export type ImportedPostResult = {
  leafletId: string;
  rkey: string | null;
  existing?: "published" | "draft";
};

export function skipPublished(
  existing: ExistingImport | null,
): ImportedPostResult | null {
  return existing?.rkey
    ? {
        leafletId: existing.leafletId,
        rkey: existing.rkey,
        existing: "published",
      }
    : null;
}

export type ExistingImport = {
  leafletId: string;
  rootEntityId: string;
  rkey: string | null;
};

export async function findExistingImport(args: {
  publication: { uri: string; identity_did: string };
  title: string;
  description: string;
  rkey: string | undefined;
}): Promise<ExistingImport | null> {
  let { publication, rkey } = args;
  let select =
    "leaflet, doc, description, archived, permission_tokens(root_entity)";
  let [bySlug, byTitle] = await Promise.all([
    rkey
      ? supabaseServerClient
          .from("leaflets_in_publications")
          .select(select)
          .eq("publication", publication.uri)
          .in("doc", [
            `at://${publication.identity_did}/site.standard.document/${rkey}`,
            `at://${publication.identity_did}/pub.leaflet.document/${rkey}`,
          ])
          .throwOnError()
      : { data: [] },
    supabaseServerClient
      .from("leaflets_in_publications")
      .select(select)
      .eq("publication", publication.uri)
      .eq("title", args.title)
      .throwOnError(),
  ]);
  type Row = {
    leaflet: string;
    doc: string | null;
    description: string;
    archived: boolean | null;
    permission_tokens: { root_entity: string } | null;
  };
  let sameText = ((byTitle.data ?? []) as unknown as Row[]).filter(
    (r) => r.description === args.description && !r.archived,
  );
  let row =
    ((bySlug.data ?? []) as unknown as Row[])[0] ??
    sameText.find((r) => r.doc) ??
    sameText[0];
  if (!row?.permission_tokens) return null;
  return {
    leafletId: row.leaflet,
    rootEntityId: row.permission_tokens.root_entity,
    rkey: row.doc ? new AtUri(row.doc).rkey : null,
  };
}
