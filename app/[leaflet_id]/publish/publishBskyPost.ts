"use server";

import { Agent as BskyAgent } from "@atproto/api";
import { TID } from "@atproto/common";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, PubLeafletDocument } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";

export async function publishPostToBsky(bskyPost: {
  text: string;
  url: string;
  title: string;
  description: string;
  record: PubLeafletDocument.Record;
  rkey: string;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let newPostUrl = bskyPost.url;
  let preview_image = await fetch(
    `https://pro.microlink.io/?url=${newPostUrl}&screenshot=true&viewport.width=1400&viewport.height=733&meta=false&embed=screenshot.url&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

  let binary = await preview_image.blob();
  let blob = await agent.com.atproto.repo.uploadBlob(binary, {
    headers: { "Content-Type": binary.type },
  });
  let bsky = new BskyAgent(credentialSession);
  let post = await bsky.app.bsky.feed.post.create(
    {
      repo: credentialSession.did!,
      rkey: TID.nextStr(),
    },
    {
      text: bskyPost.text,
      createdAt: new Date().toISOString(),
      embed: {
        $type: "app.bsky.embed.external",
        external: {
          uri: bskyPost.url,
          title: bskyPost.title,
          description: bskyPost.description,
          thumb: blob.data.blob,
        },
      },
    },
  );
  let record = bskyPost.record;
  record.postRef = post;

  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey: bskyPost.rkey,
    repo: credentialSession.did!,
    collection: bskyPost.record.$type,
    record,
    validate: false, //TODO publish the lexicon so we can validate!
  });
  return true;
}
