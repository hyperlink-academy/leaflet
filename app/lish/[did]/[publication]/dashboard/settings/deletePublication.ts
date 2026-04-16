"use server";

import { AtpBaseClient } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  entities,
  permission_tokens,
  permission_token_rights,
} from "drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { pool } from "supabase/pool";
import { revalidatePath } from "next/cache";

export async function deletePublication(
  publication_uri: string,
): Promise<
  { success: true } | { success: false; error: string | OAuthSessionError }
> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return { success: false, error: "Not authenticated" };
  }

  let pubUri = new AtUri(publication_uri);
  if (pubUri.host !== identity.atp_did) {
    return { success: false, error: "Not authorized" };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Collect these BEFORE deleting the publication row — cascading deletes would remove the join rows.
  let [legacyDocs, siteDocs, drafts] = await Promise.all([
    supabaseServerClient
      .from("documents_in_publications")
      .select("document")
      .eq("publication", publication_uri),
    supabaseServerClient
      .from("site_standard_documents_in_publications")
      .select("document")
      .eq("publication", publication_uri),
    supabaseServerClient
      .from("leaflets_in_publications")
      .select("leaflet")
      .eq("publication", publication_uri),
  ]);
  let documentUris = Array.from(
    new Set([
      ...(legacyDocs.data ?? []).map((r) => r.document),
      ...(siteDocs.data ?? []).map((r) => r.document),
    ]),
  );
  let draftTokenIds = (drafts.data ?? []).map((r) => r.leaflet);

  let pdsDeletes = Promise.all([
    ...documentUris.flatMap((docUri) => {
      let u = new AtUri(docUri);
      if (u.host !== credentialSession.did) return [];
      return [
        agent.pub.leaflet.document
          .delete({ repo: credentialSession.did, rkey: u.rkey })
          .catch(() => {}),
        agent.site.standard.document
          .delete({ repo: credentialSession.did, rkey: u.rkey })
          .catch(() => {}),
      ];
    }),
    agent.pub.leaflet.publication
      .delete({ repo: credentialSession.did, rkey: pubUri.rkey })
      .catch(() => {}),
    agent.site.standard.publication
      .delete({ repo: credentialSession.did, rkey: pubUri.rkey })
      .catch(() => {}),
  ]);

  let draftDeletes = async () => {
    if (draftTokenIds.length === 0) return;
    const client = await pool.connect();
    try {
      const db = drizzle(client);
      await db.transaction(async (tx) => {
        let tokens = await tx
          .select()
          .from(permission_tokens)
          .leftJoin(
            permission_token_rights,
            eq(permission_tokens.id, permission_token_rights.token),
          )
          .where(inArray(permission_tokens.id, draftTokenIds));
        let entitySets = tokens
          .map((t) => t.permission_token_rights?.entity_set)
          .filter((s): s is string => !!s);
        if (entitySets.length > 0) {
          await tx.delete(entities).where(inArray(entities.set, entitySets));
        }
        await tx
          .delete(permission_tokens)
          .where(inArray(permission_tokens.id, draftTokenIds));
      });
    } finally {
      client.release();
    }
  };

  await Promise.all([pdsDeletes, draftDeletes()]);

  // Delete document rows before publication rows — publication cascade would leave orphaned docs.
  if (documentUris.length > 0) {
    await Promise.all([
      supabaseServerClient
        .from("documents")
        .delete()
        .in("uri", documentUris),
      supabaseServerClient
        .from("site_standard_documents")
        .delete()
        .in("uri", documentUris),
    ]);
  }
  await Promise.all([
    supabaseServerClient
      .from("publications")
      .delete()
      .eq("uri", publication_uri),
    supabaseServerClient
      .from("site_standard_publications")
      .delete()
      .eq("uri", publication_uri),
  ]);

  revalidatePath("/lish/[did]/[publication]", "layout");
  return { success: true };
}
