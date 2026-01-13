"use server";

import { AtpBaseClient, PubLeafletDocument } from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";

type BackdateResult =
  | { success: true; publishedAt: string }
  | { success: false; error?: OAuthSessionError | string };

export async function backdatePost({
  uri,
  publishedAt,
}: {
  uri: string;
  publishedAt: string;
}): Promise<BackdateResult> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Get the existing document
  let { data: existingDoc } = await supabaseServerClient
    .from("documents")
    .select("*")
    .eq("uri", uri)
    .single();

  if (!existingDoc) {
    return { success: false, error: "Document not found" };
  }

  let record = existingDoc.data as PubLeafletDocument.Record;

  // Check if the user is the author
  if (record.author !== identity.atp_did) {
    return { success: false, error: "Not authorized" };
  }

  let aturi = new AtUri(uri);

  // Update the record with the new publishedAt date
  let updatedRecord: PubLeafletDocument.Record = {
    ...record,
    publishedAt,
  };

  // Update the record on ATP
  let result = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record: updatedRecord,
    collection: record.$type,
    validate: false,
  });

  // Optimistically write to our db
  let { error } = await supabaseServerClient
    .from("documents")
    .update({
      data: updatedRecord as Json,
    })
    .eq("uri", uri);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, publishedAt };
}
