"use server";

import { AtpBaseClient, PubLeafletComment } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { AtUri, Un$Typed } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

export async function publishComment(args: {
  document: string;
  comment: { plaintext: string; facets: PubLeafletRichtextFacet.Main[] };
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record: Un$Typed<PubLeafletComment.Record> = {
    subject: args.document,
    createdAt: new Date().toISOString(),
    plaintext: args.comment.plaintext,
    facets: args.comment.facets,
  };
  let rkey = TID.nextStr();
  let uri = AtUri.make(credentialSession.did!, "pub.leaflet.comment", rkey);
  let [profile, result] = await Promise.all([
    agent.app.bsky.actor.profile.get({
      repo: credentialSession.did!,
      rkey: "self",
    }),
    agent.pub.leaflet.comment.create(
      { rkey: TID.nextStr(), repo: credentialSession.did! },
      record,
    ),
  ]);

  await supabaseServerClient.from("bsky_profiles").upsert({
    did: credentialSession.did!,
    record: profile as Json,
  });
  let { data } = await supabaseServerClient
    .from("comments_on_documents")
    .insert({
      uri: uri.toString(),
      document: args.document,
      profile: credentialSession.did!,
      record: {
        $type: "pub.leaflet.comment",
        ...record,
      } as unknown as Json,
    })
    .select();

  return { record: data?.[0], profile: { record: profile } };
}
