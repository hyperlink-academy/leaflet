"use server";

import {
  AppBskyRichtextFacet,
  Agent as BskyAgent,
} from "@atproto/api";
import sharp from "sharp";
import { TID } from "@atproto/common";
import { OAuthSession } from "@atproto/oauth-client-node";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, SiteStandardDocument } from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { getWebpageImage } from "src/utils/getMicroLinkOgImage";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";

type PublishBskyResult =
  | { success: true }
  | { success: false; error: OAuthSessionError };

type PublishBskyArgs = {
  text: string;
  url: string;
  title: string;
  description: string;
  document_record: SiteStandardDocument.Record;
  rkey: string;
  facets: AppBskyRichtextFacet.Main[];
  // Optional override for the bsky post rkey. Callers running inside an Inngest
  // step.run should supply a memoized rkey so retries don't duplicate posts.
  bskyPostRkey?: string;
};

export async function publishPostToBskyWithSession(
  args: PublishBskyArgs & { credentialSession: OAuthSession; did: string },
): Promise<PublishBskyResult> {
  const { credentialSession, did } = args;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Get image binary - prefer cover image, fall back to screenshot
  let imageBinary: Blob | null = null;

  if (args.document_record.coverImage) {
    let cid =
      (args.document_record.coverImage.ref as unknown as { $link: string })[
        "$link"
      ] || args.document_record.coverImage.ref.toString();

    let coverImageResponse = await fetchAtprotoBlob(did, cid);
    if (coverImageResponse) {
      imageBinary = await coverImageResponse.blob();
    }
  }

  // Fall back to screenshot if no cover image or fetch failed
  if (!imageBinary) {
    let preview_image = await getWebpageImage(args.url, {
      width: 1400,
      height: 733,
      noCache: true,
    });
    imageBinary = await preview_image.blob();
  }

  // Resize and upload
  let resizedImage = await sharp(await imageBinary.arrayBuffer())
    .resize({
      width: 1200,
      height: 630,
      fit: "cover",
    })
    .webp({ quality: 85 })
    .toBuffer();

  let blob = await agent.com.atproto.repo.uploadBlob(resizedImage, {
    headers: { "Content-Type": "image/webp" },
  });
  let bsky = new BskyAgent(credentialSession);
  let post = await bsky.app.bsky.feed.post.create(
    {
      repo: credentialSession.did!,
      rkey: args.bskyPostRkey ?? TID.nextStr(),
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
  record.bskyPostRef = post;

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
  return { success: true };
}

export async function publishPostToBsky(
  args: PublishBskyArgs,
): Promise<PublishBskyResult> {
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

  return publishPostToBskyWithSession({
    ...args,
    credentialSession: sessionResult.value,
    did: identity.atp_did,
  });
}
