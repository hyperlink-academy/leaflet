"use server";

import {
  AppBskyEmbedExternal,
  AppBskyRichtextFacet,
  Agent as BskyAgent,
  BlobRef,
} from "@atproto/api";
import { TID } from "@atproto/common";
import { AtUri } from "@atproto/syntax";
import { getAuthIdentity } from "src/auth";
import { AtpBaseClient, SiteStandardDocument } from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { loggedFetchHandler } from "src/utils/loggedFetchHandler";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { idResolver } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { screenshotBskyCardImage } from "src/utils/bskyCardScreenshot";
import { uploadCoverImageThumb } from "src/utils/uploadCoverImageThumb";
import { maybeOffloadPagesToBlob } from "src/utils/offloadPagesToBlob";
import { truncateDocumentRecordForPDS } from "src/membership";
import { addBskyPostUtm, BskyUtmCampaign } from "src/utils/bskyPostUtm";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { Err, Ok, Result } from "src/result";

type StrongRef = {
  $type: "com.atproto.repo.strongRef";
  uri: string;
  cid: string;
};

export type PublishBskyResult =
  | { success: true; uri: string }
  | { success: false; error: OAuthSessionError };

type UploadThumb = (bytes: Buffer) => Promise<BlobRef>;

// Restores the OAuth session for `did` (the viewer's own by default) along
// with the client and thumbnail uploader both publishers need.
async function postingSession(did?: string): Promise<
  Result<
    {
      postAuthorDid: string;
      credentialSession: OAuthSession;
      agent: AtpBaseClient;
      uploadThumb: UploadThumb;
    },
    OAuthSessionError
  >
> {
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did)
    return Err({
      type: "oauth_session_expired",
      message: "Not authenticated",
      did: "",
    });
  let postAuthorDid = did || identity.atp_did;
  let sessionResult = await restoreOAuthSession(postAuthorDid);
  if (!sessionResult.ok) return Err(sessionResult.error);
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    loggedFetchHandler(credentialSession, { actorDid: identity.atp_did }),
  );
  let uploadThumb: UploadThumb = (bytes) =>
    agent.com.atproto.repo
      .uploadBlob(bytes, { headers: { "Content-Type": "image/webp" } })
      .then((r) => r.data.blob);
  return Ok({ postAuthorDid, credentialSession, agent, uploadThumb });
}

// The client's prefetched screenshot, uploaded as the card thumb; undefined
// when there is none or the upload fails so the caller falls through to its
// next thumb source.
async function uploadPrefetchedThumb(
  prefetchedThumb: string | undefined,
  uploadThumb: UploadThumb,
): Promise<BlobRef | undefined> {
  if (!prefetchedThumb) return undefined;
  return uploadThumb(Buffer.from(prefetchedThumb, "base64")).catch((e) => {
    console.error("Failed to upload prefetched bsky card thumbnail:", e);
    return undefined;
  });
}

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
  // passage (the /l-quote og:image) rather than the post's generic cover, and
  // when sharing a document that has no cover image.
  preferUrlScreenshot?: boolean;
  // Base64 webp card image (already 1200x630) the client prefetched from
  // /api/quote_screenshot while the share modal was open, so publishing doesn't
  // block on a fresh browser render.
  prefetchedThumb?: string;
  langs?: string[];
}): Promise<PublishBskyResult> {
  let session = await postingSession(args.ownerDid);
  if (!session.ok) return { success: false, error: session.error };
  let { postAuthorDid, credentialSession, agent, uploadThumb } = session.value;

  let documentRecord = args.document_record;
  let rkey = args.rkey;

  let { title, description, coverImage } = documentRecord;

  // The cover blob lives in the repo hosting the document. On publish that's the
  // post author's repo; on share it's the document uri's host (the original
  // author, who may differ from the cross-posting viewer).
  let coverImageDid = args.documentUri
    ? new AtUri(args.documentUri).host
    : postAuthorDid;

  // When the share wants a screenshot card (quote share, or no cover image),
  // use the client's prefetched screenshot (or take one now if the prefetch
  // failed) and fall back to the cover only if that fails too.
  let thumb = await uploadPrefetchedThumb(args.prefetchedThumb, uploadThumb);
  if (!thumb && args.preferUrlScreenshot) {
    thumb = await screenshotCardThumb(args.url, uploadThumb);
  }
  thumb ??=
    (await uploadCoverImageThumb(coverImage, coverImageDid, uploadThumb)) ??
    undefined;

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

  let associatedRefs = await resolveStrongRefs([
    documentRefUri,
    publicationRefUri,
  ]);

  let post = await createExternalCardPost(credentialSession, {
    text: args.text,
    facets: args.facets,
    url: args.url,
    title,
    description,
    thumb,
    associatedRefs,
    campaign: args.url.includes("/l-quote/")
      ? "quote"
      : rkey
        ? "publish"
        : "share",
    langs: args.langs,
  });

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

// Shares a publication's home page (rather than a post) to Bluesky. The card
// carries the publication's name/description and a strong ref to the
// publication record, with a screenshot of the page as its thumbnail (the
// publication icon when that fails).
export async function publishPublicationShareToBsky(args: {
  text: string;
  facets: AppBskyRichtextFacet.Main[];
  url: string;
  publicationUri: string;
  prefetchedThumb?: string;
  langs?: string[];
}): Promise<PublishBskyResult> {
  let session = await postingSession();
  if (!session.ok) return { success: false, error: session.error };
  let { credentialSession, uploadThumb } = session.value;

  let { data: pub } = await supabaseServerClient
    .from("publications")
    .select("uri, record")
    .eq("uri", args.publicationUri)
    .single();
  let record = normalizePublicationRecord(pub?.record);
  if (!pub || !record) throw new Error("Publication not found");

  let thumb = await uploadPrefetchedThumb(args.prefetchedThumb, uploadThumb);
  thumb ??= await screenshotCardThumb(args.url, uploadThumb);
  thumb ??=
    (await uploadCoverImageThumb(
      record.icon,
      new AtUri(pub.uri).host,
      uploadThumb,
    )) ?? undefined;

  let post = await createExternalCardPost(credentialSession, {
    text: args.text,
    facets: args.facets,
    url: args.url,
    title: record.name,
    description: record.description,
    thumb,
    associatedRefs: await resolveStrongRefs([pub.uri]),
    campaign: "share",
    langs: args.langs,
  });
  return { success: true, uri: post.uri };
}

// Creates the app.bsky.feed.post carrying an external-link card for `url`.
async function createExternalCardPost(
  credentialSession: OAuthSession,
  args: {
    text: string;
    facets: AppBskyRichtextFacet.Main[];
    url: string;
    title: string;
    description?: string;
    thumb?: BlobRef;
    associatedRefs: StrongRef[];
    campaign: BskyUtmCampaign;
    langs?: string[];
  },
) {
  // The post's rkey is minted before the record is created so the shared link
  // can carry the post's identity in its utm params: analytics later resolves
  // utm_content back to this post's at-uri to attribute traffic to it.
  // Screenshots keep using the clean args.url — the params don't change the
  // page and would only bust the client's prefetch.
  let postRkey = TID.nextStr();
  let taggedUrl = addBskyPostUtm(args.url, {
    did: credentialSession.did!,
    rkey: postRkey,
    campaign: args.campaign,
  });
  // Any link facet in the composed text pointing at the shared page gets the
  // same tagged url (byte ranges are untouched — only the link target changes).
  let facets = args.facets.map((facet) => ({
    ...facet,
    features: facet.features.map((feature) =>
      AppBskyRichtextFacet.isLink(feature) && feature.uri === args.url
        ? { ...feature, uri: taggedUrl }
        : feature,
    ),
  }));

  // associatedRefs hangs off the external embed card alongside uri/title/etc.
  // It isn't in the published @atproto/api types yet, so widen External here.
  let external: AppBskyEmbedExternal.External & {
    associatedRefs?: StrongRef[];
  } = {
    uri: taggedUrl,
    title: args.title,
    description: args.description ?? "",
  };
  if (args.associatedRefs.length > 0)
    external.associatedRefs = args.associatedRefs;
  if (args.thumb) external.thumb = args.thumb;

  let bsky = new BskyAgent({
    did: credentialSession.did,
    fetchHandler: loggedFetchHandler(credentialSession, { url: args.url }),
  });
  return bsky.app.bsky.feed.post.create(
    {
      repo: credentialSession.did!,
      rkey: postRkey,
    },
    {
      text: args.text,
      createdAt: new Date().toISOString(),
      facets,
      // The post lexicon caps langs at 3 entries.
      langs: args.langs?.filter(Boolean).slice(0, 3),
      embed: {
        $type: "app.bsky.embed.external",
        external,
      },
    },
  );
}

async function resolveStrongRefs(
  uris: (string | undefined)[],
): Promise<StrongRef[]> {
  let refs: StrongRef[] = [];
  for (let uri of uris) {
    if (!uri) continue;
    let ref = await getRecordStrongRef(uri);
    if (ref) refs.push(ref);
  }
  return refs;
}

// Screenshot `url` and upload it as a 1200x630 webp external-card thumbnail.
// Returns undefined (rather than throwing) so a failed screenshot degrades to a
// card without an image instead of failing the whole post.
async function screenshotCardThumb(
  url: string,
  uploadThumb: UploadThumb,
): Promise<BlobRef | undefined> {
  let image = await screenshotBskyCardImage(url);
  if (!image) return undefined;
  try {
    return await uploadThumb(image);
  } catch (e) {
    console.error("Failed to upload bsky card thumbnail:", e);
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
