"use server";

import {
  AppBskyRichtextFacet,
  Agent as BskyAgent,
  UnicodeString,
} from "@atproto/api";
import sharp from "sharp";
import { TID } from "@atproto/common";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, PubLeafletDocument } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import {
  getMicroLinkOgImage,
  getWebpageImage,
} from "src/utils/getMicroLinkOgImage";

export async function publishPostToBsky(args: {
  text: string;
  url: string;
  title: string;
  description: string;
  document_record: PubLeafletDocument.Record;
  rkey: string;
  facets: AppBskyRichtextFacet.Main[];
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let newPostUrl = args.url;
  let preview_image = await getWebpageImage(newPostUrl, {
    width: 1400,
    height: 733,
    noCache: true,
  });

  let binary = await preview_image.blob();
  let resized_preview_image = await sharp(await binary.arrayBuffer())
    .resize({
      width: 1200,
      fit: "cover",
    })
    .webp({ quality: 85 })
    .toBuffer();

  let blob = await agent.com.atproto.repo.uploadBlob(resized_preview_image, {
    headers: { "Content-Type": binary.type },
  });
  let bsky = new BskyAgent(credentialSession);
  let post = await bsky.app.bsky.feed.post.create(
    {
      repo: credentialSession.did!,
      rkey: TID.nextStr(),
    },
    {
      text: args.text,
      createdAt: new Date().toISOString(),
      facets: args.facets,
      embed: {
        $type: "app.bsky.embed.external",
        external: {
          uri: args.url,
          title: args.title,
          description: args.description,
          thumb: blob.data.blob,
        },
      },
    },
  );
  let record = args.document_record;
  record.postRef = post;

  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey: args.rkey,
    repo: credentialSession.did!,
    collection: args.document_record.$type,
    record,
    validate: false, //TODO publish the lexicon so we can validate!
  });
  await supabaseServerClient
    .from("documents")
    .update({
      data: record as Json,
    })
    .eq("uri", result.uri);
  return true;
}
