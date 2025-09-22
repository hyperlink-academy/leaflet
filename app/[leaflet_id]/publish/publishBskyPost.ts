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

export async function publishPostToBsky(args: {
  text: string;
  url: string;
  title: string;
  description: string;
  document_record: PubLeafletDocument.Record;
  rkey: string;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let newPostUrl = args.url;
  let preview_image = await fetch(
    `https://pro.microlink.io/?url=${newPostUrl}&screenshot=true&viewport.width=1400&viewport.height=733&meta=false&embed=screenshot.url&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

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
  let facets = await getFacetsFromText(args.text, bsky);
  let post = await bsky.app.bsky.feed.post.create(
    {
      repo: credentialSession.did!,
      rkey: TID.nextStr(),
    },
    {
      text: args.text,
      createdAt: new Date().toISOString(),
      facets,
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

const mentionRegex = /@(\S+)/g;
const hashtagRegex = /#(\S+)/g;
async function getFacetsFromText(text: string, agent: BskyAgent) {
  let facets: AppBskyRichtextFacet.Main[] = [];
  const unicodeString = new UnicodeString(text);
  let mentions = text.matchAll(mentionRegex);
  for (let match of mentions) {
    const mention = match[0]; // Full match including @
    const handle = match[1]; // Just the handle part
    const startIndex = match.index;
    const endIndex = startIndex + mention.length;
    const byteStart = unicodeString.utf16IndexToUtf8Index(startIndex);
    const byteEnd = unicodeString.utf16IndexToUtf8Index(endIndex);
    let did = await agent.resolveHandle({ handle });
    if (!did.success) continue;
    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#mention",
          did: did.data.did,
        },
      ],
    });
  }
  let hashtags = text.matchAll(hashtagRegex);
  for (let match of hashtags) {
    const hashtag = match[0]; // Full match including #
    const tag = match[1]; // Just the tag part
    const startIndex = match.index;
    const endIndex = startIndex + hashtag.length;
    const byteStart = unicodeString.utf16IndexToUtf8Index(startIndex);
    const byteEnd = unicodeString.utf16IndexToUtf8Index(endIndex);
    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag,
        },
      ],
    });
  }
  return facets;
}
