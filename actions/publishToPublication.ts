"use server";

import { updateTag } from "next/cache";
import { docRouteTag, docTag, pubTag } from "src/cacheTags";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import {
  AtpBaseClient,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksText,
  PubLeafletContent,
  PubLeafletDocument,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
  SiteStandardDocument,
} from "lexicons/api";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { isConfirmedContributor } from "src/contributorPermissions";
import { scanIndexLocal } from "src/replicache/utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { BlobRef } from "@atproto/lexicon";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";
import type { PubLeafletPublication } from "lexicons/api";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import {
  extractThemeFromFacts,
  makePublishUploadHooks,
} from "src/utils/publishHelpers";
import { maybeOffloadPagesToBlob } from "src/utils/offloadPagesToBlob";
import {
  normalizeDocumentRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";
import {
  isDocumentCollection,
  isPublicationCollection,
  getDocumentType,
} from "src/utils/collectionHelpers";
import { inngest } from "app/api/inngest/client";

type PublishResult =
  | { success: true; rkey: string; record: SiteStandardDocument.Record }
  | { success: false; error: OAuthSessionError };

export async function publishToPublication({
  root_entity,
  publication_uri,
  leaflet_id,
  title,
  description,
  tags,
  entitiesToDelete,
  publishedAt,
  postPreferences,
  sendEmail = true,
  showInDiscover,
}: {
  root_entity: string;
  publication_uri?: string;
  leaflet_id: string;
  title?: string;
  description?: string;
  tags?: string[];
  entitiesToDelete?: string[];
  publishedAt?: string;
  postPreferences?: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
  sendEmail?: boolean;
  // Whether this post appears in Discover and aggregated feeds. Undefined leaves
  // the record as-is; pass false (e.g. a "quiet" publish) to opt the document's
  // own record out of those feeds.
  showInDiscover?: boolean;
}): Promise<PublishResult> {
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

  // Check if we're publishing to a publication or standalone, and figure out
  // whose PDS the record will live in. For publications, the record always
  // lives in the publication owner's PDS, so contributors publish using the
  // owner's restored OAuth session.
  let draft: any = null;
  let existingDocUri: string | null = null;
  let pdsDid = identity.atp_did;

  if (publication_uri) {
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select("*, leaflets_in_publications(*, documents(*))")
      .eq("uri", publication_uri)
      .eq("leaflets_in_publications.leaflet", leaflet_id)
      .single();
    console.log(error);

    if (!data) throw new Error("No draft or not publisher");

    let isOwner = data.identity_did === identity.atp_did;
    if (
      !isOwner &&
      !(await isConfirmedContributor(publication_uri, identity.atp_did))
    )
      throw new Error("No draft or not publisher");

    pdsDid = data.identity_did!;
    draft = data.leaflets_in_publications[0];
    existingDocUri = draft?.doc;
  } else {
    // Publishing standalone - use leaflets_to_documents
    let { data } = await supabaseServerClient
      .from("leaflets_to_documents")
      .select("*, documents(*)")
      .eq("leaflet", leaflet_id)
      .single();
    draft = data;
    existingDocUri = draft?.document;

    // If updating an existing document, verify the current user is the owner
    if (existingDocUri) {
      let docOwner = new AtUri(existingDocUri).host;
      if (docOwner !== identity.atp_did) {
        return {
          success: false,
          error: {
            type: "oauth_session_expired" as const,
            message: "Not the document owner",
            did: identity.atp_did,
          },
        };
      }
    }
  }

  // Restore the OAuth session of the PDS that will host the record.
  // For publications this is the owner; for standalone docs this is the
  // current user. If a contributor is publishing and the owner is signed
  // out, this surfaces a clear "owner needs to sign in again" error.
  const sessionResult = await restoreOAuthSession(pdsDid);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Heuristic: Remove title entities if this is the first time publishing
  // (when coming from a standalone leaflet with entitiesToDelete passed in)
  if (entitiesToDelete && entitiesToDelete.length > 0 && !existingDocUri) {
    await supabaseServerClient
      .from("entities")
      .delete()
      .in("id", entitiesToDelete);
  }

  let { data } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  let facts = (data as unknown as Fact<Attribute>[]) || [];

  let { pages } = await processBlocksToPages({
    facts,
    root_entity,
    hooks: makePublishUploadHooks(agent, credentialSession.did!),
  });

  let existingRecord: Partial<SiteStandardDocument.Record> = {};
  const normalizedDoc = normalizeDocumentRecord(draft?.documents?.data);
  if (normalizedDoc) {
    // When reading existing data, use normalized format to extract fields
    // The theme is preserved in NormalizedDocument for backward compatibility
    existingRecord = {
      publishedAt: normalizedDoc.publishedAt,
      title: normalizedDoc.title,
      description: normalizedDoc.description,
      tags: normalizedDoc.tags,
      coverImage: normalizedDoc.coverImage,
      theme: normalizedDoc.theme,
      bskyPostRef: normalizedDoc.bskyPostRef,
    };
  }

  // Resolve preferences: explicit param > draft DB value
  const basePreferences = postPreferences ?? draft?.preferences;
  // When the caller opts the post out of Discover (e.g. a "quiet" publish), bake
  // showInDiscover:false into the record itself (rather than a DB-only flag) so
  // it survives the appview re-indexing the record from the firehose.
  const preferences =
    showInDiscover === false
      ? { ...(basePreferences ?? {}), showInDiscover: false }
      : basePreferences;

  // Gather contributors from the draft so the published record records its
  // multi-contributor byline. Only relevant for publication documents, and only
  // written to the site.standard.document record.
  let contributors: SiteStandardDocument.Contributor[] = [];
  if (publication_uri) {
    let { data: contributorRows } = await supabaseServerClient
      .from("leaflet_contributors")
      .select("contributor_did")
      .eq("leaflet", leaflet_id)
      .order("created_at", { ascending: true });
    contributors =
      contributorRows?.map((c) => ({ did: c.contributor_did })) ?? [];
  }

  // Extract theme for standalone documents (not for publications). Only keep
  // it if at least one property beyond the showPageBackground default is set.
  let theme: PubLeafletPublication.Theme | undefined;
  if (!publication_uri) {
    let extracted = await extractThemeFromFacts(facts, root_entity, agent);
    if (
      Object.keys(extracted).length > 1 ||
      extracted.showPageBackground !== true
    )
      theme = extracted;
  }

  let coverImageBlob: BlobRef | undefined;
  {
    let scan = scanIndexLocal(facts);
    let coverRef = scan.eav(root_entity, "root/cover-image")[0];
    let [imageData] = coverRef
      ? scan.eav(coverRef.data.value, "block/image")
      : [];
    if (imageData) {
      let imageResponse = await fetch(imageData.data.src);
      if (imageResponse.status === 200) {
        let binary = await imageResponse.blob();
        let blob = await agent.com.atproto.repo.uploadBlob(binary, {
          headers: { "Content-Type": binary.type },
        });
        coverImageBlob = blob.data.blob;
      }
    }
  }

  // Determine the collection to use - preserve existing schema if updating
  const existingCollection = existingDocUri
    ? new AtUri(existingDocUri).collection
    : undefined;
  const documentType = getDocumentType(existingCollection);

  // Build the pages array (used by both formats)
  const pagesArray = pages.map((p) => {
    if (p.type === "canvas") {
      return {
        $type: "pub.leaflet.pages.canvas" as const,
        id: p.id,
        blocks: p.blocks as PubLeafletPagesCanvas.Block[],
      };
    } else {
      return {
        $type: "pub.leaflet.pages.linearDocument" as const,
        id: p.id,
        blocks: p.blocks as PubLeafletPagesLinearDocument.Block[],
      };
    }
  });

  // Determine the rkey early since we need it for the path field
  const rkey = existingDocUri ? new AtUri(existingDocUri).rkey : TID.nextStr();

  // Resolve fields: use new values if provided, otherwise preserve existing
  const resolvedDescription =
    description !== undefined ? description : existingRecord.description;
  const resolvedTags = tags !== undefined ? tags : existingRecord.tags;
  const resolvedCoverImage = coverImageBlob ?? existingRecord.coverImage;
  const resolvedPublishedAt =
    publishedAt || existingRecord.publishedAt || new Date().toISOString();

  // Create record based on the document type
  let record: PubLeafletDocument.Record | SiteStandardDocument.Record;
  // The record we persist locally always holds the fully-inflated content; when
  // we offload pages to a blob, recordForPDS gets a shrunk copy below.
  let recordForPDS: PubLeafletDocument.Record | SiteStandardDocument.Record;

  if (documentType === "site.standard.document") {
    // site.standard.document format
    // For standalone docs, use HTTPS URL; for publication docs, use the publication AT-URI
    const siteUri =
      publication_uri || `https://leaflet.pub/p/${credentialSession.did}`;

    const siteRecord: SiteStandardDocument.Record = {
      $type: "site.standard.document",
      title: title || "",
      site: siteUri,
      path: "/" + rkey,
      publishedAt: resolvedPublishedAt,
      ...(resolvedDescription !== undefined && {
        description: resolvedDescription,
      }),
      ...(resolvedTags !== undefined && { tags: resolvedTags }),
      ...(resolvedCoverImage && { coverImage: resolvedCoverImage }),
      ...(existingRecord.bskyPostRef && {
        bskyPostRef: existingRecord.bskyPostRef,
      }),
      // Include theme for standalone documents (not for publication documents)
      ...(!publication_uri && theme && { theme }),
      ...(contributors.length > 0 && { contributors }),
      ...(preferences && {
        preferences: {
          $type: "pub.leaflet.publication#preferences" as const,
          ...preferences,
        },
      }),
      content: {
        $type: "pub.leaflet.content" as const,
        pages: pagesArray,
      },
    };
    record = siteRecord;

    recordForPDS = await maybeOffloadPagesToBlob(siteRecord, agent);
  } else {
    // pub.leaflet.document format (legacy)
    record = {
      $type: "pub.leaflet.document",
      author: credentialSession.did!,
      ...(publication_uri && { publication: publication_uri }),
      ...(theme && { theme }),
      ...(preferences && {
        preferences: {
          $type: "pub.leaflet.publication#preferences" as const,
          ...preferences,
        },
      }),
      title: title || "",
      description: resolvedDescription || "",
      ...(resolvedTags !== undefined && { tags: resolvedTags }),
      ...(resolvedCoverImage && { coverImage: resolvedCoverImage }),
      ...(existingRecord.bskyPostRef && {
        postRef: existingRecord.bskyPostRef,
      }),
      pages: pagesArray,
      publishedAt: resolvedPublishedAt,
    } satisfies PubLeafletDocument.Record;
    recordForPDS = record;
  }

  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey,
    repo: credentialSession.did!,
    collection: recordForPDS.$type,
    record: recordForPDS,
    validate: false, //TODO publish the lexicon so we can validate!
  });

  // Optimistically create database entries
  await supabaseServerClient.from("documents").upsert({
    uri: result.uri,
    data: record as unknown as Json,
    indexed: true,
  });

  if (publication_uri) {
    // Publishing to a publication - update both tables
    await Promise.all([
      supabaseServerClient.from("documents_in_publications").upsert({
        publication: publication_uri,
        document: result.uri,
      }),
      supabaseServerClient.from("leaflets_in_publications").upsert({
        doc: result.uri,
        leaflet: leaflet_id,
        publication: publication_uri,
        title: title,
        description: description,
        tags: resolvedTags ?? [],
      }),
    ]);
  } else {
    // Publishing standalone - update leaflets_to_documents
    await supabaseServerClient.from("leaflets_to_documents").upsert({
      leaflet: leaflet_id,
      document: result.uri,
      title: title || "",
      description: description || "",
      tags: resolvedTags ?? [],
    });

    // Heuristic: Remove title entities if this is the first time publishing standalone
    // (when entitiesToDelete is provided and there's no existing document)
    if (entitiesToDelete && entitiesToDelete.length > 0 && !existingDocUri) {
      await supabaseServerClient
        .from("entities")
        .delete()
        .in("id", entitiesToDelete);
    }
  }

  // Create notifications for mentions (only on first publish)
  if (!existingDocUri) {
    await createMentionNotifications(
      result.uri,
      record,
      credentialSession.did!,
    );
  }

  // On first publish to a newsletter-enabled pub, claim the post's send slot.
  // The composite PK on publication_post_sends is the real idempotency guard —
  // ignoreDuplicates makes re-publishes and concurrent runs a no-op. Claiming
  // the slot even when not sending (status "skipped") is also what stops the
  // firehose-driven broadcast in sync_document_metadata from emailing a post the
  // author opted out of: it finds the row already present and skips.
  if (publication_uri && !existingDocUri) {
    const { data: settings } = await supabaseServerClient
      .from("publication_newsletter_settings")
      .select("enabled")
      .eq("publication", publication_uri)
      .maybeSingle();
    if (settings?.enabled) {
      const { data: inserted } = await supabaseServerClient
        .from("publication_post_sends")
        .upsert(
          {
            publication: publication_uri,
            document: result.uri,
            status: sendEmail ? "pending" : "skipped",
          },
          { onConflict: "publication,document", ignoreDuplicates: true },
        )
        .select();
      if (sendEmail && inserted && inserted.length > 0) {
        await inngest.send({
          name: "newsletter/post.send.requested",
          data: {
            publication_uri,
            document_uri: result.uri,
            root_entity,
          },
        });
      }
    }
  }

  // Bust the cached published pages: the post page itself (including a
  // previously cached 404 at these coordinates) and the publication's pages.
  updateTag(docTag(result.uri));
  updateTag(docRouteTag(pdsDid, rkey));
  if (publication_uri) updateTag(pubTag(publication_uri));

  return { success: true, rkey, record: JSON.parse(JSON.stringify(record)) };
}

/**
 * Extract mentions from a published document and create notifications
 */
async function createMentionNotifications(
  documentUri: string,
  record: PubLeafletDocument.Record | SiteStandardDocument.Record,
  authorDid: string,
) {
  const mentionedDids = new Set<string>();
  const mentionedPublications = new Map<string, string>(); // Map of DID -> publication URI
  const mentionedDocuments = new Map<string, string>(); // Map of DID -> document URI
  const embeddedBskyPosts = new Map<string, string>(); // Map of author DID -> post URI

  // Extract pages from either format
  let pages: PubLeafletContent.Main["pages"] | undefined;
  if (record.$type === "site.standard.document") {
    const content = record.content;
    if (content && PubLeafletContent.isMain(content)) {
      pages = content.pages;
    }
  } else {
    pages = record.pages;
  }

  if (!pages) return;

  // Helper to extract blocks from all pages (both linear and canvas)
  function getAllBlocks(pages: PubLeafletContent.Main["pages"]) {
    const blocks: (
      | PubLeafletPagesLinearDocument.Block["block"]
      | PubLeafletPagesCanvas.Block["block"]
    )[] = [];
    for (const page of pages) {
      if (page.$type === "pub.leaflet.pages.linearDocument") {
        const linearPage = page as PubLeafletPagesLinearDocument.Main;
        for (const blockWrapper of linearPage.blocks) {
          blocks.push(blockWrapper.block);
        }
      } else if (page.$type === "pub.leaflet.pages.canvas") {
        const canvasPage = page as PubLeafletPagesCanvas.Main;
        for (const blockWrapper of canvasPage.blocks) {
          blocks.push(blockWrapper.block);
        }
      }
    }
    return blocks;
  }

  const allBlocks = getAllBlocks(pages);

  // Extract mentions from all text blocks and embedded Bluesky posts
  for (const block of allBlocks) {
    // Check for embedded Bluesky posts
    if (PubLeafletBlocksBskyPost.isMain(block)) {
      const bskyPostUri = block.postRef.uri;
      // Extract the author DID from the post URI (at://did:xxx/app.bsky.feed.post/xxx)
      const postAuthorDid = new AtUri(bskyPostUri).host;
      if (postAuthorDid !== authorDid) {
        embeddedBskyPosts.set(postAuthorDid, bskyPostUri);
      }
    }

    // Check for text blocks with mentions
    if (block.$type === "pub.leaflet.blocks.text") {
      const textBlock = block as PubLeafletBlocksText.Main;
      if (textBlock.facets) {
        for (const facet of textBlock.facets) {
          for (const feature of facet.features) {
            // Check for DID mentions
            if (PubLeafletRichtextFacet.isDidMention(feature)) {
              if (feature.did !== authorDid) {
                mentionedDids.add(feature.did);
              }
            }
            // Check for AT URI mentions (publications and documents)
            if (PubLeafletRichtextFacet.isAtMention(feature)) {
              const uri = new AtUri(feature.atURI);

              if (isPublicationCollection(uri.collection)) {
                // Get the publication owner's DID
                const { data: publication } = await supabaseServerClient
                  .from("publications")
                  .select("identity_did")
                  .eq("uri", feature.atURI)
                  .single();

                if (publication && publication.identity_did !== authorDid) {
                  mentionedPublications.set(
                    publication.identity_did,
                    feature.atURI,
                  );
                }
              } else if (isDocumentCollection(uri.collection)) {
                // Get the document owner's DID
                const { data: document } = await supabaseServerClient
                  .from("documents")
                  .select("uri, data")
                  .eq("uri", feature.atURI)
                  .single();

                if (document) {
                  const normalizedMentionedDoc = normalizeDocumentRecord(
                    document.data,
                  );
                  // Get the author from the document URI (the DID is the host part)
                  const mentionedUri = new AtUri(feature.atURI);
                  const docAuthor = mentionedUri.host;
                  if (normalizedMentionedDoc && docAuthor !== authorDid) {
                    mentionedDocuments.set(docAuthor, feature.atURI);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Create notifications for DID mentions
  for (const did of mentionedDids) {
    const notification: Notification = {
      id: v7(),
      recipient: did,
      data: {
        type: "mention",
        document_uri: documentUri,
        mention_type: "did",
      },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(did);
  }

  // Create notifications for publication mentions
  for (const [recipientDid, publicationUri] of mentionedPublications) {
    const notification: Notification = {
      id: v7(),
      recipient: recipientDid,
      data: {
        type: "mention",
        document_uri: documentUri,
        mention_type: "publication",
        mentioned_uri: publicationUri,
      },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(recipientDid);
  }

  // Create notifications for document mentions
  for (const [recipientDid, mentionedDocUri] of mentionedDocuments) {
    const notification: Notification = {
      id: v7(),
      recipient: recipientDid,
      data: {
        type: "mention",
        document_uri: documentUri,
        mention_type: "document",
        mentioned_uri: mentionedDocUri,
      },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(recipientDid);
  }

  // Create notifications for embedded Bluesky posts (only if the author has a Leaflet account)
  if (embeddedBskyPosts.size > 0) {
    // Check which of the Bluesky post authors have Leaflet accounts
    const { data: identities } = await supabaseServerClient
      .from("identities")
      .select("atp_did")
      .in("atp_did", Array.from(embeddedBskyPosts.keys()));

    const leafletUserDids = new Set(identities?.map((i) => i.atp_did) ?? []);

    for (const [postAuthorDid, bskyPostUri] of embeddedBskyPosts) {
      // Only notify if the post author has a Leaflet account
      if (leafletUserDids.has(postAuthorDid)) {
        const notification: Notification = {
          id: v7(),
          recipient: postAuthorDid,
          data: {
            type: "bsky_post_embed",
            document_uri: documentUri,
            bsky_post_uri: bskyPostUri,
          },
        };
        await supabaseServerClient.from("notifications").insert(notification);
        await pingIdentityToUpdateNotification(postAuthorDid);
      }
    }
  }
}
