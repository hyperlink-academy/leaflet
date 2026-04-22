"use server";

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
import { scanIndexLocal } from "src/replicache/utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { BlobRef } from "@atproto/lexicon";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";
import { Lock } from "src/utils/lock";
import type { PubLeafletPublication } from "lexicons/api";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import {
  normalizeDocumentRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import {
  ColorToRGB,
  ColorToRGBA,
} from "components/ThemeManager/colorToLexicons";
import { parseColor } from "@react-stately/color";
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
  cover_image,
  entitiesToDelete,
  publishedAt,
  postPreferences,
}: {
  root_entity: string;
  publication_uri?: string;
  leaflet_id: string;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
  entitiesToDelete?: string[];
  publishedAt?: string;
  postPreferences?: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
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

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Check if we're publishing to a publication or standalone
  let draft: any = null;
  let existingDocUri: string | null = null;

  if (publication_uri) {
    // Publishing to a publication - use leaflets_in_publications
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select("*, leaflets_in_publications(*, documents(*))")
      .eq("uri", publication_uri)
      .eq("leaflets_in_publications.leaflet", leaflet_id)
      .single();
    console.log(error);

    if (!data || identity.atp_did !== data?.identity_did)
      throw new Error("No draft or not publisher");
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

  const uploadLock = new Lock();
  let { pages } = await processBlocksToPages({
    facts,
    root_entity,
    hooks: {
      uploadImage: async (src: string) => {
        const data = await fetch(src);
        if (data.status !== 200) return;
        const binary = await data.blob();
        return uploadLock.withLock(async () => {
          const blob = await agent.com.atproto.repo.uploadBlob(binary, {
            headers: { "Content-Type": binary.type },
          });
          return blob.data.blob;
        });
      },
      uploadPoll: async (entityId, record) => {
        // Use the entity id as the rkey so the editor can associate the poll
        // definition with the in-document poll block.
        const { data: pollResult } = await agent.com.atproto.repo.putRecord({
          rkey: entityId,
          repo: credentialSession.did!,
          collection: record.$type,
          record,
          validate: false,
        });
        console.log(
          await supabaseServerClient.from("atp_poll_records").upsert({
            uri: pollResult.uri,
            cid: pollResult.cid,
            record: record as Json,
          }),
        );
        return { uri: pollResult.uri, cid: pollResult.cid };
      },
    },
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
  const preferences = postPreferences ?? draft?.preferences;

  // Extract theme for standalone documents (not for publications)
  let theme: PubLeafletPublication.Theme | undefined;
  if (!publication_uri) {
    theme = await extractThemeFromFacts(facts, root_entity, agent);
  }

  // Upload cover image if provided
  let coverImageBlob: BlobRef | undefined;
  if (cover_image) {
    let scan = scanIndexLocal(facts);
    let [imageData] = scan.eav(cover_image, "block/image");
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

  if (documentType === "site.standard.document") {
    // site.standard.document format
    // For standalone docs, use HTTPS URL; for publication docs, use the publication AT-URI
    const siteUri =
      publication_uri || `https://leaflet.pub/p/${credentialSession.did}`;

    record = {
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
    } satisfies SiteStandardDocument.Record;
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
  }

  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey,
    repo: credentialSession.did!,
    collection: record.$type,
    record,
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
        cover_image: cover_image ?? null,
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
      cover_image: cover_image ?? null,
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

  // Fire newsletter broadcast on first publish to a newsletter-enabled pub.
  // The composite PK on publication_post_sends is the real idempotency guard —
  // ignoreDuplicates makes re-publishes and concurrent runs a no-op.
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
            status: "pending",
          },
          { onConflict: "publication,document", ignoreDuplicates: true },
        )
        .select();
      if (inserted && inserted.length > 0) {
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

  return { success: true, rkey, record: JSON.parse(JSON.stringify(record)) };
}


async function extractThemeFromFacts(
  facts: Fact<any>[],
  root_entity: string,
  agent: AtpBaseClient,
): Promise<PubLeafletPublication.Theme | undefined> {
  let scan = scanIndexLocal(facts);
  let pageBackground = scan.eav(root_entity, "theme/page-background")?.[0]?.data
    .value;
  let cardBackground = scan.eav(root_entity, "theme/card-background")?.[0]?.data
    .value;
  let primary = scan.eav(root_entity, "theme/primary")?.[0]?.data.value;
  let accentBackground = scan.eav(root_entity, "theme/accent-background")?.[0]
    ?.data.value;
  let accentText = scan.eav(root_entity, "theme/accent-text")?.[0]?.data.value;
  let showPageBackground = !scan.eav(
    root_entity,
    "theme/card-border-hidden",
  )?.[0]?.data.value;
  let backgroundImage = scan.eav(root_entity, "theme/background-image")?.[0];
  let backgroundImageRepeat = scan.eav(
    root_entity,
    "theme/background-image-repeat",
  )?.[0];
  let pageWidth = scan.eav(root_entity, "theme/page-width")?.[0];

  let theme: PubLeafletPublication.Theme = {
    showPageBackground: showPageBackground ?? true,
  };

  if (pageWidth) theme.pageWidth = pageWidth.data.value;
  if (pageBackground)
    theme.backgroundColor = ColorToRGBA(parseColor(`hsba(${pageBackground})`));
  if (cardBackground)
    theme.pageBackground = ColorToRGBA(parseColor(`hsba(${cardBackground})`));
  if (primary) theme.primary = ColorToRGB(parseColor(`hsba(${primary})`));
  if (accentBackground)
    theme.accentBackground = ColorToRGB(
      parseColor(`hsba(${accentBackground})`),
    );
  if (accentText)
    theme.accentText = ColorToRGB(parseColor(`hsba(${accentText})`));

  // Upload background image if present
  if (backgroundImage?.data) {
    let imageData = await fetch(backgroundImage.data.src);
    if (imageData.status === 200) {
      let binary = await imageData.blob();
      let blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });

      theme.backgroundImage = {
        $type: "pub.leaflet.theme.backgroundImage",
        image: blob.data.blob,
        repeat: backgroundImageRepeat?.data.value ? true : false,
        ...(backgroundImageRepeat?.data.value && {
          width: Math.floor(backgroundImageRepeat.data.value),
        }),
      };
    }
  }

  // Only return theme if at least one property is set
  if (Object.keys(theme).length > 1 || theme.showPageBackground !== true) {
    return theme;
  }

  return undefined;
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
