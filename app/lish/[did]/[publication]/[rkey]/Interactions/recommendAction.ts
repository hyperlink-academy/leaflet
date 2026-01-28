"use server";

import { AtpBaseClient, PubLeafletInteractionsRecommend } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { AtUri, Un$Typed } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

type RecommendResult =
  | { success: true; uri: string }
  | {
      success: false;
      error: OAuthSessionError | { type: string; message: string };
    };

export async function recommendAction(args: {
  document: string;
}): Promise<RecommendResult> {
  console.log("recommend action...");
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    console.log("recommended");

    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
      },
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

  let record: Un$Typed<PubLeafletInteractionsRecommend.Record> = {
    subject: args.document,
    createdAt: new Date().toISOString(),
  };

  let rkey = TID.nextStr();
  let uri = AtUri.make(
    credentialSession.did!,
    "pub.leaflet.interactions.recommend",
    rkey,
  );

  await agent.pub.leaflet.interactions.recommend.create(
    { rkey, repo: credentialSession.did! },
    record,
  );

  await supabaseServerClient.from("recommends_on_documents").upsert({
    uri: uri.toString(),
    document: args.document,
    recommender_did: credentialSession.did!,
    record: {
      $type: "pub.leaflet.interactions.recommend",
      ...record,
    } as unknown as Json,
  });

  return {
    success: true,
    uri: uri.toString(),
  };
}

export async function unrecommendAction(args: {
  document: string;
}): Promise<RecommendResult> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
      },
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

  // Find the existing recommend record
  const { data: existingRecommend } = await supabaseServerClient
    .from("recommends_on_documents")
    .select("uri")
    .eq("document", args.document)
    .eq("recommender_did", credentialSession.did!)
    .single();

  if (!existingRecommend) {
    return {
      success: false,
      error: {
        type: "not_found",
        message: "Recommend not found",
      },
    };
  }

  let uri = new AtUri(existingRecommend.uri);

  await agent.pub.leaflet.interactions.recommend.delete({
    rkey: uri.rkey,
    repo: credentialSession.did!,
  });

  await supabaseServerClient
    .from("recommends_on_documents")
    .delete()
    .eq("uri", existingRecommend.uri);

  return {
    success: true,
    uri: existingRecommend.uri,
  };
}
