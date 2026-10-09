import { sql } from "drizzle-orm";
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
}): Promise<{ leafletId: string; rkey: string | null }> {
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
  if (args.mode !== "publish") return { leafletId: permTokenId, rkey: null };

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
  return { leafletId: permTokenId, rkey: published.rkey };
}
