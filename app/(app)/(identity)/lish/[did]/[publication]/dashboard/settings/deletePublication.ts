"use server";

import { AtpBaseClient } from "lexicons/api";
import { getAuthIdentity } from "src/auth";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
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
import { revalidateAllPublicationPaths } from "src/utils/revalidatePublication";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { cancelPublicationMemberSubscriptions } from "src/membership.server";
import { getCache } from "@vercel/functions";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { vercel, VERCEL_PROJECT, VERCEL_TEAM } from "src/vercel";

export async function deletePublication(
  publication_uri: string,
): Promise<
  { success: true } | { success: false; error: string | OAuthSessionError }
> {
  let identity = await getAuthIdentity();
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

  // Deleting the publications row cascades the membership rows away, so cancel
  // members' Stripe subscriptions first — and abort the whole delete if any
  // can't be canceled, rather than leave live billing with no record.
  const membershipsCanceled =
    await cancelPublicationMemberSubscriptions(publication_uri);
  if (!membershipsCanceled) {
    return {
      success: false,
      error:
        "Couldn't cancel member subscriptions; publication was not deleted",
    };
  }

  // Collect these BEFORE deleting the publication row — cascading deletes would remove the join rows.
  let [docs, drafts, domains] = await Promise.all([
    supabaseServerClient
      .from("documents_in_publications")
      .select("document")
      .eq("publication", publication_uri),
    supabaseServerClient
      .from("leaflets_in_publications")
      .select("leaflet")
      .eq("publication", publication_uri),
    supabaseServerClient
      .from("publication_domains")
      .select("domain, custom_domains(identity_id)")
      .eq("publication", publication_uri),
  ]);
  // The default subdomain registered at creation is the only custom_domains row
  // with no owning identity; user-added domains (identity_id set) just lose
  // their publication_domains link via cascade and stay registered to the user.
  let defaultDomains = (domains.data ?? [])
    .filter(
      (d) =>
        d.domain.endsWith(".leaflet.pub") &&
        d.custom_domains?.identity_id === null,
    )
    .map((d) => d.domain);
  let documentUris = Array.from(
    new Set([...(docs.data ?? []).map((r) => r.document)]),
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
    // The recommendations record shares the publication's rkey.
    agent.pub.leaflet.graph.recommendations
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
    await supabaseServerClient
      .from("documents")
      .delete()
      .in("uri", documentUris);
  }
  const { data: pubRow } = await supabaseServerClient
    .from("publications")
    .select("record")
    .eq("uri", publication_uri)
    .maybeSingle();
  // Enumerates published pages and post URLs — must run while the join rows
  // still exist.
  await revalidateAllPublicationPaths(publication_uri, [
    normalizePublicationRecord(pubRow?.record)?.name,
  ]);
  await supabaseServerClient
    .from("publications")
    .delete()
    .eq("uri", publication_uri);

  // Release the default leaflet.pub subdomain so it can be reused. Subdomain
  // availability is checked against the Vercel project, so remove the domain
  // there first, and keep our rows for any domain whose removal fails — a
  // deleted row with the domain still registered in Vercel would leave the
  // subdomain unavailable with no trace of who held it.
  let released = (
    await Promise.all(
      defaultDomains.map(async (domain) => {
        if (isProductionDomain()) {
          try {
            await vercel.projects.removeProjectDomain({
              idOrName: VERCEL_PROJECT,
              teamId: VERCEL_TEAM,
              domain,
            });
          } catch (e) {
            console.log("Failed to remove domain from Vercel", domain, e);
            return null;
          }
        }
        return domain;
      }),
    )
  ).filter((d): d is string => d !== null);
  if (released.length > 0) {
    // custom_domain_routes -> custom_domains doesn't cascade; clear any routes
    // first so the domain delete can't hit the FK.
    await supabaseServerClient
      .from("custom_domain_routes")
      .delete()
      .in("domain", released);
    await supabaseServerClient
      .from("custom_domains")
      .delete()
      .in("domain", released);
    await Promise.all(
      released.map((domain) =>
        getCache()
          .expireTag(`domain:${domain}`)
          .catch(() => {}),
      ),
    );
  }

  return { success: true };
}
