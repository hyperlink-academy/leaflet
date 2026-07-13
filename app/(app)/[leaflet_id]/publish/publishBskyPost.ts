"use server";

import {
  AppBskyEmbedExternal,
  AppBskyRichtextFacet,
  Agent as BskyAgent,
  BlobRef,
} from "@atproto/api";
import sharp from "sharp";
import { TID } from "@atproto/common";
import { AtUri } from "@atproto/syntax";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, SiteStandardDocument } from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { idResolver } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { getWebpageImage } from "src/utils/getMicroLinkOgImage";
import { uploadCoverImageThumb } from "src/utils/uploadCoverImageThumb";
import { maybeOffloadPagesToBlob } from "src/utils/offloadPagesToBlob";
import { truncateDocumentRecordForPDS } from "src/membership";

type StrongRef = {
  $type: "com.atproto.repo.strongRef";
  uri: string;
  cid: string;
};

type PublishBskyResult =
  | { success: true; uri: string }
  | { success: false; error: OAuthSessionError };

export async function publishPostToBsky(args: {
  text: string;
  url: string;
  facets: AppBskyRichtextFacet.Main[];
  document_record: SiteStandardDocument.Record;
  rkey?: string;
  ownerDid?: string;
  documentUri?: string;
  publicationUri?: string;
  // Prefer a live screenshot of `url` as the card thumbnail over the document's
  // cover image. Set when sharing a quote, whose card should show the quoted
  // passage (the /l-quote og:image) rather than the post's generic cover.
  preferUrlScreenshot?: boolean;
}): Promise<PublishBskyResult> {
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
  let postAuthorDid = args.ownerDid || identity.atp_did;

  const sessionResult = await restoreOAuthSession(postAuthorDid);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  let uploadThumb = (bytes: Buffer) =>
    agent.com.atproto.repo
      .uploadBlob(bytes, { headers: { "Content-Type": "image/webp" } })
      .then((r) => r.data.blob);

  let documentRecord = args.document_record;
  let rkey = args.rkey;

  let { title, description, coverImage } = documentRecord;

  // The cover blob lives in the repo hosting the document. On publish that's the
  // post author's repo; on share it's the document uri's host (the original
  // author, who may differ from the cross-posting viewer).
  let coverImageDid = args.documentUri
    ? new AtUri(args.documentUri).host
    : postAuthorDid;

  // A quote share wants the per-quote screenshot (the /l-quote og:image) as the
  // card, not the doc's generic cover, so screenshot the url first and fall back
  // to the cover only if that fails.
  let thumb = args.preferUrlScreenshot
    ? await screenshotCardThumb(args.url, uploadThumb)
    : undefined;
  thumb ??=
    (await uploadCoverImageThumb(coverImage, coverImageDid, uploadThumb)) ??
    undefined;

  // associatedRefs hangs off the external embed card alongside uri/title/etc.
  // It isn't in the published @atproto/api types yet, so widen External here.
  let external: AppBskyEmbedExternal.External & {
    associatedRefs?: StrongRef[];
  } = {
    uri: args.url,
    title,
    description: description ?? "",
  };

  // On publish, fall back to a page screenshot when there's no other thumb.
  if (rkey && !thumb) {
    thumb = await screenshotCardThumb(args.url, uploadThumb);
  }

  let documentRefUri: string | undefined;
  let publicationRefUri: string | undefined;
  if (rkey) {
    documentRefUri = `at://${credentialSession.did!}/${documentRecord.$type}/${rkey}`;
    let { data: docInPub } = await supabaseServerClient
      .from("documents_in_publications")
      .select("publication")
      .eq("document", documentRefUri)
      .maybeSingle();
    publicationRefUri = docInPub?.publication ?? undefined;
  } else {
    documentRefUri = args.documentUri;
    publicationRefUri = args.publicationUri;
  }

  let associatedRefs: StrongRef[] = [];
  for (let uri of [documentRefUri, publicationRefUri]) {
    if (!uri) continue;
    let ref = await getRecordStrongRef(uri);
    if (ref) associatedRefs.push(ref);
  }
  if (associatedRefs.length > 0) external.associatedRefs = associatedRefs;

  if (thumb) external.thumb = thumb;

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
        external,
      },
    },
  );

  if (rkey) {
    let record = documentRecord;
    record.bskyPostRef = post;

    // The caller hands us the fully inflated record. It needs the same
    // members-only truncation and blob offload the initial publish applied,
    // otherwise this re-put would leak gated content (or 413) on the PDS.
    const recordForPDS = await maybeOffloadPagesToBlob(
      truncateDocumentRecordForPDS(record),
      agent,
    );

    let { data: result } = await agent.com.atproto.repo.putRecord({
      rkey,
      repo: credentialSession.did!,
      collection: record.$type,
      record: recordForPDS,
      validate: false, //TODO publish the lexicon so we can validate!
    });
    await supabaseServerClient
      .from("documents")
      .update({
        data: record as Json,
      })
      .eq("uri", result.uri);
  }

  return { success: true, uri: post.uri };
}

// Screenshot `url` and upload it as a 1200x630 webp external-card thumbnail.
// Returns undefined (rather than throwing) so a failed screenshot degrades to a
// card without an image instead of failing the whole post.
async function screenshotCardThumb(
  url: string,
  uploadThumb: (bytes: Buffer) => Promise<BlobRef>,
): Promise<BlobRef | undefined> {
  let preview_image = await getWebpageImage(url, {
    width: 1400,
    height: 733,
    noCache: true,
  });

  if (!preview_image.ok) {
    console.error(
      `Screenshot for bsky card failed (${preview_image.status}): ${await preview_image
        .text()
        .catch(() => "")}`,
    );
    return undefined;
  }

  try {
    let resizedImage = await sharp(await preview_image.arrayBuffer())
      .resize({ width: 1200, height: 630, fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
    return await uploadThumb(resizedImage);
  } catch (e) {
    console.error("Failed to process bsky card thumbnail:", e);
    return undefined;
  }
}

// Resolve a record URI to a strong ref ({ uri, cid }) by reading its current CID
async function getRecordStrongRef(uri: string): Promise<StrongRef | null> {
  try {
    let { host, collection, rkey } = new AtUri(uri);
    let identity = await idResolver.did.resolve(host);
    let service = identity?.service?.find((s) => s.id === "#atproto_pds");
    if (!service) return null;
    let res = await fetch(
      `${service.serviceEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${host}&collection=${collection}&rkey=${rkey}`,
    );
    if (!res.ok) return null;
    let data = (await res.json()) as { uri: string; cid?: string };
    if (!data.cid) return null;
    return {
      $type: "com.atproto.repo.strongRef",
      uri: data.uri,
      cid: data.cid,
    };
  } catch {
    return null;
  }
}
