"use server";

import { AtpBaseClient } from "lexicons/api";
import { Json } from "supabase/database.types";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { Lock } from "src/utils/lock";
import { OAuthSessionError, restoreOAuthSession } from "src/atproto-oauth";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";
import { getIdentityData } from "actions/getIdentityData";
import {
  leafletToPublicationPageRecord,
  pathToRkey,
} from "src/utils/leafletToPublicationPageRecord";
import { supabaseServerClient } from "supabase/serverClient";

type PublishPagesResult =
  | { success: true; published: { id: number; uri: string }[] }
  | {
      success: false;
      error: OAuthSessionError | { type: "other"; message: string };
    };

export async function publishPublicationPages({
  publication_uri,
}: {
  publication_uri: string;
}): Promise<PublishPagesResult> {
  const identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .eq("uri", publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did) {
    return {
      success: false,
      error: { type: "other", message: "Not the publication owner" },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  const credentialSession = sessionResult.value;
  const agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  const { data: pageRows } = await supabaseServerClient
    .from("publication_pages")
    .select("id, title, path, leaflet_src")
    .eq("publication", publication_uri);
  if (!pageRows || pageRows.length === 0) {
    return { success: true, published: [] };
  }

  const uploadLock = new Lock();

  const published: { id: number; uri: string }[] = [];
  for (const page of pageRows) {
    const path = page.path ?? "/";

    const { result: leafletRes } = await get_leaflet_data.handler(
      { token_id: page.leaflet_src },
      { supabase: supabaseServerClient },
    );
    const rootEntity = leafletRes.data?.root_entity;
    if (!rootEntity) continue;

    const { data: factData } = await supabaseServerClient.rpc("get_facts", {
      root: rootEntity,
    });
    const facts = (factData as unknown as Fact<Attribute>[]) || [];

    const record = await leafletToPublicationPageRecord({
      facts,
      root_entity: rootEntity,
      publication_uri,
      path,
      title: page.title ?? "",
      hooks: {
        uploadImage: async (src: string) => {
          const data = await fetch(src);
          if (data.status !== 200) return;
          const binary = await data.blob();
          return uploadLock.withLock(async () => {
            const blob = await agent.com.atproto.repo.uploadBlob(binary, {
              headers: { "Content-Type": binary.type },
            });
            return blob.data.blob;
          });
        },
        uploadPoll: async (entityId, pollRecord) => {
          const { data: pollResult } = await agent.com.atproto.repo.putRecord({
            rkey: entityId,
            repo: credentialSession.did!,
            collection: pollRecord.$type,
            record: pollRecord,
            validate: false,
          });
          await supabaseServerClient.from("atp_poll_records").upsert({
            uri: pollResult.uri,
            cid: pollResult.cid,
            record: pollRecord as Json,
          });
          return { uri: pollResult.uri, cid: pollResult.cid };
        },
      },
    });

    const rkey = pathToRkey(path);
    const { data: putResult } = await agent.com.atproto.repo.putRecord({
      rkey,
      repo: credentialSession.did!,
      collection: "pub.leaflet.publicationPage",
      record,
      validate: false,
    });

    await supabaseServerClient
      .from("publication_pages")
      .update({
        record: record as unknown as Json,
        record_uri: putResult.uri,
      })
      .eq("id", page.id)
      .eq("publication", publication_uri);

    published.push({ id: page.id, uri: putResult.uri });
  }

  return { success: true, published };
}
