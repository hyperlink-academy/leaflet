"use server";

import {
  AppBskyEmbedExternal,
  AppBskyRichtextFacet,
  Agent as BskyAgent,
} from "@atproto/api";
import sharp from "sharp";
import { TID } from "@atproto/common";
import { getIdentityData } from "actions/getIdentityData";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getWebpageImage } from "src/utils/getMicroLinkOgImage";

type ShareResult =
  | { success: true; uri: string }
  | {
      success: false;
      error: OAuthSessionError | { type: string; message: string };
    };

// Posts a Bluesky post from the current viewer with an external embed linking
// to the shared post. Unlike publishPostToBsky (which writes a bskyPostRef back
// into the author's document record), this is a plain cross-post any viewer can
// make about any post, so it stays self-contained.
export async function sharePostToBsky(args: {
  text: string;
  facets: AppBskyRichtextFacet.Main[];
  url: string;
  title: string;
  description: string;
}): Promise<ShareResult> {
  let identity = await getIdentityData();
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

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let bsky = new BskyAgent(credentialSession);

  let external: AppBskyEmbedExternal.External = {
    uri: args.url,
    title: args.title,
    description: args.description,
  };

  // Screenshot the shared post for the card thumbnail. Mirrors the fallback in
  // publishPostToBsky — a screenshot hiccup or unexpected format should degrade
  // to a card without a thumbnail rather than failing the share.
  let preview_image = await getWebpageImage(args.url, {
    width: 1400,
    height: 733,
    noCache: true,
  });
  if (preview_image.ok) {
    try {
      let resizedImage = await sharp(await (await preview_image.blob()).arrayBuffer())
        .resize({ width: 1200, height: 630, fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();
      let blob = await bsky.com.atproto.repo.uploadBlob(resizedImage, {
        headers: { "Content-Type": "image/webp" },
      });
      external.thumb = blob.data.blob;
    } catch (e) {
      console.error("Failed to process bsky share card thumbnail:", e);
    }
  } else {
    console.error(
      `Screenshot for bsky share card failed (${preview_image.status})`,
    );
  }

  let post = await bsky.app.bsky.feed.post.create(
    { repo: credentialSession.did!, rkey: TID.nextStr() },
    {
      text: args.text,
      createdAt: new Date().toISOString(),
      facets: args.facets,
      embed: {
        $type: "app.bsky.embed.external",
        external,
      },
    },
  );

  return { success: true, uri: post.uri };
}
