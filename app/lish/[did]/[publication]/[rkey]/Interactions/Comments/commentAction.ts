"use server";

import { AtpBaseClient, PubLeafletComment } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { AtUri, lexToJson, Un$Typed } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { Notification } from "src/notifications";

export async function publishComment(args: {
  document: string;
  pageId?: string;
  comment: {
    plaintext: string;
    facets: PubLeafletRichtextFacet.Main[];
    replyTo?: string;
    attachment: PubLeafletComment.Record["attachment"];
  };
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
    onPage: args.pageId,
    createdAt: new Date().toISOString(),
    plaintext: args.comment.plaintext,
    facets: args.comment.facets,
    reply: args.comment.replyTo ? { parent: args.comment.replyTo } : undefined,
    attachment: args.comment.attachment,
  };
  let rkey = TID.nextStr();
  let uri = AtUri.make(credentialSession.did!, "pub.leaflet.comment", rkey);
  let [profile, result] = await Promise.all([
    agent.app.bsky.actor.profile.get({
      repo: credentialSession.did!,
      rkey: "self",
    }),
    agent.pub.leaflet.comment.create(
      { rkey, repo: credentialSession.did! },
      record,
    ),
  ]);

  await supabaseServerClient.from("bsky_profiles").upsert({
    did: credentialSession.did!,
    record: profile.value as Json,
  });
  let { data, error } = await supabaseServerClient
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
  let notifications: Notification[] = [
    {
      recipient: new AtUri(args.document).host,
      data: { type: "comment", comment_uri: uri.toString() },
    },
  ];
  if (args.comment.replyTo)
    notifications.push({
      recipient: new AtUri(args.comment.replyTo).host,
      data: { type: "comment", comment_uri: uri.toString() },
    });
  // SOMEDAY: move this out the action with inngest or workflows
  await supabaseServerClient.from("notifications").insert(notifications);

  return {
    record: data?.[0].record as Json,
    profile: lexToJson(profile.value),
    uri: uri.toString(),
  };
}
