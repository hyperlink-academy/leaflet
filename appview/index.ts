import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { IdResolver, MemoryCache } from "@atproto/identity";
import Client from "ioredis";
const idResolver = new IdResolver({ didCache: new MemoryCache() });
import { Firehose, MemoryRunner, Event } from "@atproto/sync";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletContent,
  PubLeafletDocument,
  PubLeafletGraphRecommendations,
  PubLeafletGraphSubscription,
  PubLeafletPublication,
  PubLeafletComment,
  PubLeafletPollVote,
  PubLeafletPollDefinition,
  PubLeafletInteractionsRecommend,
  SiteStandardDocument,
  SiteStandardPublication,
  SiteStandardGraphSubscription,
  SiteStandardGraphRecommend,
} from "lexicons/api";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import { writeFile, readFile } from "fs/promises";
import { inngest } from "app/api/inngest/client";
import { stripThemeWithoutType } from "src/utils/stripThemeWithoutType";
import { pageHasMembersDelimiter } from "src/membership";
import { trackSubscriptionEvent } from "src/subscriptionAnalytics";
import { MAIN_SITE_URL } from "src/utils/customDomain";
import type { AppviewRevalidateEvent } from "app/api/appview_revalidate/route";

const cursorFile = process.env.CURSOR_FILE || "/cursor/cursor";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const redisClient: Client | null = process.env.REDIS_URL
  ? new Client(process.env.REDIS_URL)
  : null;

class RedisProfileCache {
  constructor(private client: Client) {}
  async clearEntry(did: string): Promise<void> {
    await this.client.del(`bsky-profile:${did}`);
  }
}

const profileCache: RedisProfileCache | null = redisClient
  ? new RedisProfileCache(redisClient)
  : null;

const QUOTE_PARAM = "/l-quote/";

// Nearly every indexed publication belongs to another standard.site app and is
// only ever read back out of the index, so the Leaflet-specific follow-ups
// (ISR revalidation, the metadata sync job) run only for publications Leaflet
// manages: those with a draft leaflet or a draft linked into them. The draft
// leaflet alone isn't enough — older publications only get one on their next
// editor visit.
const MANAGED_MARKERS = "draft_leaflet, leaflets_in_publications(leaflet)";
type ManagedMarkers = {
  draft_leaflet: string | null;
  leaflets_in_publications: { leaflet: string }[];
};
function isManaged(pub: ManagedMarkers | null | undefined) {
  return (
    !!pub &&
    (pub.draft_leaflet !== null || pub.leaflets_in_publications.length > 0)
  );
}

async function isLeafletPublication(uri: string) {
  let { data } = await supabase
    .from("publications")
    .select(MANAGED_MARKERS)
    .eq("uri", uri)
    .limit(1, { referencedTable: "leaflets_in_publications" })
    .maybeSingle();
  return isManaged(data);
}

async function isInLeafletPublication(documentUri: string) {
  let { data } = await supabase
    .from("documents_in_publications")
    .select(`publications(${MANAGED_MARKERS})`)
    .eq("document", documentUri)
    .limit(1, { referencedTable: "publications.leaflets_in_publications" })
    .maybeSingle();
  return isManaged(data?.publications);
}

// Bridgy mirrors fediverse blogs into atproto repos; keeping those out of the
// index keeps them out of the discover feeds. The DID cache makes this one
// directory lookup per repo rather than per record.
async function isBridgyRepo(did: string) {
  try {
    let doc = await idResolver.did.resolve(did);
    return !!doc?.service?.some(
      (s) =>
        typeof s.serviceEndpoint === "string" &&
        s.serviceEndpoint.includes("atproto.brid.gy"),
    );
  } catch (e) {
    console.error("did resolution failed for", did, e);
    return false;
  }
}

// Not an upsert: identities.home_page defaults to a function that creates a
// homepage (entity set, entity, permission token), and Postgres evaluates the
// default before the ON CONFLICT check, so upserting an existing did leaks an
// orphaned homepage every time.
async function ensureIdentity(did: string) {
  let { data } = await supabase
    .from("identities")
    .select("id")
    .eq("atp_did", did)
    .maybeSingle();
  if (!data) await supabase.from("identities").insert({ atp_did: did });
}

// The published pages are ISR-cached with a long revalidate window; indexing
// a record from the firehose is the freshness signal for writes that don't go
// through Leaflet's own actions, so tell the Next app to drop the affected
// paths. Best-effort: a failed call only extends staleness until the page's
// ISR timer, so it logs and never throws into the indexing path. Sent after
// the DB writes land so the re-render reads the indexed state.
async function notifyRevalidate(event: AppviewRevalidateEvent) {
  try {
    let res = await fetch(`${MAIN_SITE_URL}/api/appview_revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok)
      console.error(
        `revalidate ${event.kind} failed: ${res.status} ${await res.text()}`,
      );
  } catch (e) {
    console.error("revalidate request failed", e);
  }
}

// Deletes remove the rows the document's paths are derived from, so snapshot
// them first and hand them to the revalidation endpoint.
async function deleteDocument(uri: string) {
  let { data: doc } = await supabase
    .from("documents")
    .select(
      `data, sort_date, documents_in_publications(publication, publications(${MANAGED_MARKERS}))`,
    )
    .eq("uri", uri)
    .limit(1, {
      referencedTable:
        "documents_in_publications.publications.leaflets_in_publications",
    })
    .maybeSingle();
  await supabase.from("documents").delete().eq("uri", uri);
  let link = doc?.documents_in_publications[0];
  if (!link || !isManaged(link.publications)) return;
  await notifyRevalidate({
    kind: "document",
    uri,
    snapshot: {
      publication: link.publication,
      path: (doc?.data as { path?: string } | null)?.path ?? null,
      sort_date: doc?.sort_date ?? null,
    },
  });
}

// The managed check has to happen before the delete: the draft links cascade
// away with the publication row.
async function deletePublication(uri: string) {
  let { data: prev } = await supabase
    .from("publications")
    .select(`name, ${MANAGED_MARKERS}`)
    .eq("uri", uri)
    .limit(1, { referencedTable: "leaflets_in_publications" })
    .maybeSingle();
  await supabase.from("publications").delete().eq("uri", uri);
  if (!isManaged(prev)) return;
  await notifyRevalidate({ kind: "publication", uri, names: [prev?.name] });
}

// The PDS copy of a members-only post is truncated at the delimiter (see
// truncateDocumentRecordForPDS), so for posts published through Leaflet the
// firehose record must not clobber the full-content copy publishToPublication
// wrote to `documents`. Third-party gated posts (no leaflet draft) still
// index from the firehose — their PDS record is all the content there is.
// Besides the leaflet-draft link we also keep any stored copy that has blocks
// below the delimiter: on a first publish the firehose event can beat the
// leaflets_in_publications insert, and the full copy must win that race.
async function isGatedLeafletManagedDoc(
  uri: string,
  isPublicationDoc: boolean,
  firstPage: unknown,
): Promise<boolean> {
  if (!isPublicationDoc || !pageHasMembersDelimiter(firstPage)) return false;
  const [{ data: managed }, { data: existing }] = await Promise.all([
    supabase
      .from("leaflets_in_publications")
      .select("leaflet")
      .eq("doc", uri)
      .limit(1),
    supabase.from("documents").select("data").eq("uri", uri).maybeSingle(),
  ]);
  if (managed?.length) return true;
  return recordHasContentBelowDelimiter(existing?.data);
}

function recordHasContentBelowDelimiter(data: unknown): boolean {
  const record = data as {
    $type?: string;
    pages?: unknown[];
    content?: { pages?: unknown[] };
  } | null;
  const pages =
    record?.$type === "site.standard.document"
      ? record.content?.pages
      : record?.pages;
  const blocks = (pages?.[0] as { blocks?: { block?: { $type?: string } }[] })
    ?.blocks;
  if (!Array.isArray(blocks)) return false;
  const idx = blocks.findIndex(
    (b) => b?.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  );
  return idx !== -1 && idx < blocks.length - 1;
}

async function main() {
  const runner = new MemoryRunner({});
  let firehose = new Firehose({
    service: "wss://relay1.us-west.bsky.network",
    subscriptionReconnectDelay: 3000,
    excludeAccount: true,
    excludeIdentity: false,
    runner,
    idResolver,
    filterCollections: [
      ids.PubLeafletDocument,
      ids.PubLeafletPublication,
      ids.PubLeafletGraphSubscription,
      ids.PubLeafletGraphRecommendations,
      ids.PubLeafletComment,
      ids.PubLeafletPollVote,
      ids.PubLeafletPollDefinition,
      ids.PubLeafletInteractionsRecommend,
      ids.AppBskyActorProfile,
      "app.bsky.feed.post",
      ids.SiteStandardDocument,
      ids.SiteStandardPublication,
      ids.SiteStandardGraphSubscription,
      ids.SiteStandardGraphRecommend,
      "parts.page.mention.service",
      "parts.page.mention.config",
    ],
    handleEvent,
    onError: (err) => {
      console.error(err);
    },
  });
  console.log("starting firehose consumer");
  firehose.start();
  let cleaningUp = false;
  const cleanup = async () => {
    if (cleaningUp) return;
    cleaningUp = true;
    console.log("shutting down firehose...");
    await firehose.destroy();
    await runner.destroy();
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();

async function handleEvent(evt: Event) {
  if (evt.event === "identity") {
    if (profileCache) {
      try {
        await profileCache.clearEntry(evt.did);
      } catch (err) {
        console.error("Failed to clear profile cache for", evt.did, err);
      }
    }
  }
  if (
    evt.event == "account" ||
    evt.event === "identity" ||
    evt.event === "sync"
  )
    return;
  if (evt.collection !== "app.bsky.feed.post")
    console.log(
      `${evt.event} in ${evt.collection} ${evt.uri}: ${evt.seq} ${evt.time}`,
    );
  if (evt.collection === ids.PubLeafletDocument) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletDocument.validateRecord(evt.record);
      if (!record.success) {
        console.log(record.error);
        return;
      }
      if (await isBridgyRepo(evt.did)) return;
      let managed =
        !!record.value.publication &&
        (await isLeafletPublication(record.value.publication));
      if (
        !(await isGatedLeafletManagedDoc(
          evt.uri.toString(),
          !!record.value.publication,
          record.value.pages?.[0],
        ))
      ) {
        let docResult = await supabase.from("documents").upsert({
          uri: evt.uri.toString(),
          data: record.value as Json,
          indexed: true,
        });
        if (docResult.error) console.log(docResult.error);
      }
      // The sync job polls Bluesky like counts and claims newsletter sends;
      // neither applies to a third-party post with no Bluesky post.
      if (managed || record.value.postRef)
        await inngest.send({
          name: "appview/sync-document-metadata",
          data: {
            document_uri: evt.uri.toString(),
            bsky_post_uri: record.value.postRef?.uri,
            event_type: evt.event,
          },
        });
      if (record.value.publication) {
        let publicationURI = new AtUri(record.value.publication);

        if (publicationURI.host !== evt.uri.host) {
          console.log("Unauthorized to create post!");
          return;
        }
        let docInPublicationResult = await supabase
          .from("documents_in_publications")
          .upsert({
            publication: record.value.publication,
            document: evt.uri.toString(),
            members_only: pageHasMembersDelimiter(record.value.pages?.[0]),
          });
        await supabase
          .from("documents_in_publications")
          .delete()
          .neq("publication", record.value.publication)
          .eq("document", evt.uri.toString());

        if (docInPublicationResult.error)
          console.log(docInPublicationResult.error);
      }
      if (managed)
        await notifyRevalidate({ kind: "document", uri: evt.uri.toString() });
    }
    if (evt.event === "delete") {
      await deleteDocument(evt.uri.toString());
    }
  }
  if (evt.collection === ids.PubLeafletPublication) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletPublication.validateRecord(evt.record);
      if (!record.success) return;
      // A rename leaves cached pages under the old name-form URLs; snapshot it
      // so they get dropped too.
      let { data: prev } = await supabase
        .from("publications")
        .select(`name, ${MANAGED_MARKERS}`)
        .eq("uri", evt.uri.toString())
        .limit(1, { referencedTable: "leaflets_in_publications" })
        .maybeSingle();
      await ensureIdentity(evt.did);
      await supabase.from("publications").upsert({
        uri: evt.uri.toString(),
        identity_did: evt.did,
        name: record.value.name,
        record: record.value as Json,
      });
      if (isManaged(prev))
        await notifyRevalidate({
          kind: "publication",
          uri: evt.uri.toString(),
          names: [record.value.name, prev?.name],
        });
    }
    if (evt.event === "delete") {
      await deletePublication(evt.uri.toString());
    }
  }
  if (evt.collection === ids.PubLeafletComment) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletComment.validateRecord(evt.record);
      if (!record.success) return;
      let { error } = await supabase.from("comments_on_documents").upsert({
        uri: evt.uri.toString(),
        profile: evt.did,
        document: record.value.subject,
        record: record.value as Json,
      });
      // Comment counts are server-rendered into post pages and listings.
      if (await isInLeafletPublication(record.value.subject))
        await notifyRevalidate({
          kind: "interaction",
          document: record.value.subject,
        });
    }
    if (evt.event === "delete") {
      let { data: comment } = await supabase
        .from("comments_on_documents")
        .select("document")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase
        .from("comments_on_documents")
        .delete()
        .eq("uri", evt.uri.toString());
      if (comment?.document && (await isInLeafletPublication(comment.document)))
        await notifyRevalidate({
          kind: "interaction",
          document: comment.document,
        });
    }
  }
  if (evt.collection === ids.PubLeafletPollVote) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletPollVote.validateRecord(evt.record);
      if (!record.success) return;
      let { error } = await supabase.from("atp_poll_votes").upsert({
        uri: evt.uri.toString(),
        voter_did: evt.did,
        poll_uri: record.value.poll.uri,
        poll_cid: record.value.poll.cid,
        record: record.value as Json,
      });
    }
    if (evt.event === "delete") {
      await supabase
        .from("atp_poll_votes")
        .delete()
        .eq("uri", evt.uri.toString());
    }
  }
  if (evt.collection === ids.PubLeafletPollDefinition) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletPollDefinition.validateRecord(evt.record);
      if (!record.success) return;
      let { error } = await supabase.from("atp_poll_records").upsert({
        uri: evt.uri.toString(),
        cid: evt.cid.toString(),
        record: record.value as Json,
      });
      if (error) console.log("Error upserting poll definition:", error);
    }
    if (evt.event === "delete") {
      await supabase
        .from("atp_poll_records")
        .delete()
        .eq("uri", evt.uri.toString());
    }
  }
  if (evt.collection === ids.PubLeafletInteractionsRecommend) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletInteractionsRecommend.validateRecord(evt.record);
      if (!record.success) return;
      await ensureIdentity(evt.did);
      let { error } = await supabase.from("recommends_on_documents").upsert({
        uri: evt.uri.toString(),
        recommender_did: evt.did,
        document: record.value.subject,
        record: record.value as Json,
      });
      if (error) console.log("Error upserting recommend:", error);
      // Recommend counts are server-rendered into post pages and listings.
      if (await isInLeafletPublication(record.value.subject))
        await notifyRevalidate({
          kind: "interaction",
          document: record.value.subject,
        });
    }
    if (evt.event === "delete") {
      let { data: recommend } = await supabase
        .from("recommends_on_documents")
        .select("document")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase
        .from("recommends_on_documents")
        .delete()
        .eq("uri", evt.uri.toString());
      if (
        recommend?.document &&
        (await isInLeafletPublication(recommend.document))
      )
        await notifyRevalidate({
          kind: "interaction",
          document: recommend.document,
        });
    }
  }
  if (evt.collection === ids.PubLeafletGraphRecommendations) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletGraphRecommendations.validateRecord(evt.record);
      if (!record.success) return;
      let pubUri;
      try {
        pubUri = new AtUri(record.value.publication);
      } catch {
        return;
      }
      // A repo may only publish recommendations on behalf of its own
      // publications.
      if (pubUri.host !== evt.uri.host) return;
      let recommendations = [...new Set(record.value.recommendations)]
        .filter((r) => r !== record.value.publication)
        .slice(0, 3);
      // One row per edge; replace this record's rows wholesale so removed
      // recommendations don't linger.
      await supabase
        .from("publication_recommendations")
        .delete()
        .eq("uri", evt.uri.toString());
      if (recommendations.length > 0) {
        let { error } = await supabase.from("publication_recommendations").insert(
          recommendations.map((recommendation, sort_order) => ({
            uri: evt.uri.toString(),
            publication: record.value.publication,
            recommendation,
            sort_order,
          })),
        );
        if (error)
          console.log("Error inserting publication recommendations:", error);
      }
    }
    if (evt.event === "delete") {
      await supabase
        .from("publication_recommendations")
        .delete()
        .eq("uri", evt.uri.toString());
    }
  }
  if (evt.collection === ids.PubLeafletGraphSubscription) {
    if (evt.event === "create" || evt.event === "update") {
      let record = PubLeafletGraphSubscription.validateRecord(evt.record);
      if (!record.success) return;
      await ensureIdentity(evt.did);
      // App-created subscriptions insert their row (and track their own
      // analytics event) before the firehose echoes the record back, so only
      // a previously unseen row counts as a firehose-originated subscribe.
      // Same logic in the site.standard.graph.subscription handler below.
      let { data: existing } = await supabase
        .from("publication_subscriptions")
        .select("uri")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase.from("publication_subscriptions").upsert({
        uri: evt.uri.toString(),
        identity: evt.did,
        publication: record.value.publication,
        record: record.value as Json,
      });
      if (!existing)
        await trackSubscriptionEvent({
          event: "subscribe",
          method: "atproto",
          origin: "firehose",
          publicationUri: record.value.publication,
          subscriberDid: evt.did,
          recordUri: evt.uri.toString(),
        });
    }
    if (evt.event === "delete") {
      let { data: existing } = await supabase
        .from("publication_subscriptions")
        .select("publication")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase
        .from("publication_subscriptions")
        .delete()
        .eq("uri", evt.uri.toString());
      if (existing)
        await trackSubscriptionEvent({
          event: "unsubscribe",
          method: "atproto",
          origin: "firehose",
          publicationUri: existing.publication,
          subscriberDid: evt.did,
          recordUri: evt.uri.toString(),
        });
    }
  }
  // site.standard.document records go into the main "documents" table
  // The normalization layer handles reading both pub.leaflet and site.standard formats
  if (evt.collection === ids.SiteStandardDocument) {
    if (evt.event === "create" || evt.event === "update") {
      let record = SiteStandardDocument.validateRecord(evt.record);
      if (!record.success) {
        console.log(record.error);
        return;
      }
      // When the record offloads pages to a blob, skip the documents upsert —
      // the firehose record has `pages: []` and would clobber the fully
      // inflated copy that publishToPublication wrote optimistically. The
      // inngest sync_document_metadata function is the writer in that case.
      if (await isBridgyRepo(evt.did)) return;
      const hasBlobPages =
        PubLeafletContent.isMain(record.value.content) &&
        !!record.value.content.blobPages;
      const inPublication = !!record.value.site?.startsWith("at://");
      let managed =
        inPublication && (await isLeafletPublication(record.value.site!));
      if (
        !hasBlobPages &&
        !(await isGatedLeafletManagedDoc(
          evt.uri.toString(),
          inPublication,
          PubLeafletContent.isMain(record.value.content)
            ? record.value.content.pages?.[0]
            : undefined,
        ))
      ) {
        let docResult = await supabase.from("documents").upsert({
          uri: evt.uri.toString(),
          data: record.value as Json,
          indexed: true,
        });
        if (docResult.error) console.log(docResult.error);
      }
      // The sync job inflates blob pages, polls Bluesky like counts and claims
      // newsletter sends; none of that applies to a third-party post with no
      // Bluesky post.
      if (managed || hasBlobPages || record.value.bskyPostRef)
        await inngest.send({
          name: "appview/sync-document-metadata",
          data: {
            document_uri: evt.uri.toString(),
            bsky_post_uri: record.value.bskyPostRef?.uri,
            event_type: evt.event,
          },
        });

      // site.standard.document uses "site" field to reference the publication
      // For documents in publications, site is an AT-URI (at://did:plc:xxx/site.standard.publication/rkey)
      // For standalone documents, site is an HTTPS URL (https://leaflet.pub/p/did:plc:xxx)
      // Only link to publications table for AT-URI sites
      if (record.value.site && record.value.site.startsWith("at://")) {
        let siteURI = new AtUri(record.value.site);

        if (siteURI.host !== evt.uri.host) {
          console.log("Unauthorized to create document in site!");
          return;
        }
        let docInPublicationResult = await supabase
          .from("documents_in_publications")
          .upsert({
            publication: record.value.site,
            document: evt.uri.toString(),
            // With offloaded blob pages the firehose record has `pages: []`,
            // so we can't tell whether a delimiter exists — leave the flag
            // publishToPublication wrote untouched.
            ...(!hasBlobPages && PubLeafletContent.isMain(record.value.content)
              ? {
                  members_only: pageHasMembersDelimiter(
                    record.value.content.pages?.[0],
                  ),
                }
              : {}),
          });
        await supabase
          .from("documents_in_publications")
          .delete()
          .neq("publication", record.value.site)
          .eq("document", evt.uri.toString());

        if (docInPublicationResult.error)
          console.log(docInPublicationResult.error);
      }
      // Blob-offloaded records aren't readable until sync_document_metadata
      // inflates them; that function revalidates when it's done.
      if (managed && !hasBlobPages)
        await notifyRevalidate({ kind: "document", uri: evt.uri.toString() });
    }
    if (evt.event === "delete") {
      await deleteDocument(evt.uri.toString());
    }
  }

  // site.standard.publication records go into the main "publications" table
  if (evt.collection === ids.SiteStandardPublication) {
    if (evt.event === "create" || evt.event === "update") {
      let record = SiteStandardPublication.validateRecord(
        stripThemeWithoutType(evt.record),
      );
      if (!record.success) return;
      // A rename leaves cached pages under the old name-form URLs; snapshot it
      // so they get dropped too.
      let { data: prev } = await supabase
        .from("publications")
        .select(`name, ${MANAGED_MARKERS}`)
        .eq("uri", evt.uri.toString())
        .limit(1, { referencedTable: "leaflets_in_publications" })
        .maybeSingle();
      await ensureIdentity(evt.did);
      let { error } = await supabase.from("publications").upsert({
        uri: evt.uri.toString(),
        identity_did: evt.did,
        name: record.value.name,
        record: record.value as Json,
      });
      if (error) console.log(error);
      if (isManaged(prev))
        await notifyRevalidate({
          kind: "publication",
          uri: evt.uri.toString(),
          names: [record.value.name, prev?.name],
        });
    }
    if (evt.event === "delete") {
      await deletePublication(evt.uri.toString());
    }
  }

  // site.standard.graph.recommend records go into the main "recommends_on_documents" table
  if (evt.collection === ids.SiteStandardGraphRecommend) {
    if (evt.event === "create" || evt.event === "update") {
      let record = SiteStandardGraphRecommend.validateRecord(evt.record);
      if (!record.success) return;
      await ensureIdentity(evt.did);
      let { error } = await supabase.from("recommends_on_documents").upsert({
        uri: evt.uri.toString(),
        recommender_did: evt.did,
        document: record.value.document,
        record: record.value as Json,
      });
      if (error) console.log("Error upserting recommend:", error);
      // Recommend counts are server-rendered into post pages and listings.
      if (await isInLeafletPublication(record.value.document))
        await notifyRevalidate({
          kind: "interaction",
          document: record.value.document,
        });
    }
    if (evt.event === "delete") {
      let { data: recommend } = await supabase
        .from("recommends_on_documents")
        .select("document")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase
        .from("recommends_on_documents")
        .delete()
        .eq("uri", evt.uri.toString());
      if (
        recommend?.document &&
        (await isInLeafletPublication(recommend.document))
      )
        await notifyRevalidate({
          kind: "interaction",
          document: recommend.document,
        });
    }
  }

  // site.standard.graph.subscription records go into the main "publication_subscriptions" table
  if (evt.collection === ids.SiteStandardGraphSubscription) {
    if (evt.event === "create" || evt.event === "update") {
      let record = SiteStandardGraphSubscription.validateRecord(evt.record);
      if (!record.success) return;
      await ensureIdentity(evt.did);
      let { data: existing } = await supabase
        .from("publication_subscriptions")
        .select("uri")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase.from("publication_subscriptions").upsert({
        uri: evt.uri.toString(),
        identity: evt.did,
        publication: record.value.publication,
        record: record.value as Json,
      });
      if (!existing)
        await trackSubscriptionEvent({
          event: "subscribe",
          method: "atproto",
          origin: "firehose",
          publicationUri: record.value.publication,
          subscriberDid: evt.did,
          recordUri: evt.uri.toString(),
        });
    }
    if (evt.event === "delete") {
      let { data: existing } = await supabase
        .from("publication_subscriptions")
        .select("publication")
        .eq("uri", evt.uri.toString())
        .maybeSingle();
      await supabase
        .from("publication_subscriptions")
        .delete()
        .eq("uri", evt.uri.toString());
      if (existing)
        await trackSubscriptionEvent({
          event: "unsubscribe",
          method: "atproto",
          origin: "firehose",
          publicationUri: existing.publication,
          subscriberDid: evt.did,
          recordUri: evt.uri.toString(),
        });
    }
  }
  if (evt.collection === ids.AppBskyActorProfile) {
    if (profileCache) {
      try {
        await profileCache.clearEntry(evt.did);
      } catch (err) {
        console.error("Failed to clear profile cache for", evt.did, err);
      }
    }
  }
  if (evt.collection === "parts.page.mention.service") {
    if (evt.event === "create" || evt.event === "update") {
      let { error } = await supabase.from("mention_services").upsert({
        uri: evt.uri.toString(),
        identity_did: evt.did,
        record: evt.record as Json,
      });
      if (error) console.log("Error upserting mention service:", error);
    }
    if (evt.event === "delete") {
      await supabase
        .from("mention_services")
        .delete()
        .eq("uri", evt.uri.toString());
    }
  }
  if (evt.collection === "parts.page.mention.config") {
    if (evt.event === "create" || evt.event === "update") {
      let record = evt.record as Record<string, unknown> | undefined;
      if (!Array.isArray(record?.services)) return;
      let { error } = await supabase.from("mention_service_configs").upsert({
        uri: evt.uri.toString(),
        identity_did: evt.did,
        record: evt.record as Json,
      });
      if (error) console.log("Error upserting mention config:", error);
    }
    if (evt.event === "delete") {
      await supabase
        .from("mention_service_configs")
        .delete()
        .eq("uri", evt.uri.toString());
    }
  }
  if (evt.collection === "app.bsky.feed.post") {
    if (evt.event !== "create") return;

    // Early exit if no embed
    if (
      !evt.record ||
      typeof evt.record !== "object" ||
      !("embed" in evt.record)
    )
      return;

    // Check if embed contains our quote param using optional chaining
    const embedRecord = evt.record as any;
    const hasQuoteParam =
      embedRecord.embed?.external?.uri?.includes(QUOTE_PARAM) ||
      embedRecord.embed?.media?.external?.uri?.includes(QUOTE_PARAM);

    if (!hasQuoteParam) return;

    // Now validate the record since we know it contains our quote param
    let record = AppBskyFeedPost.validateRecord(evt.record);
    if (!record.success) {
      console.log(record.error);
      return;
    }

    let embed: string | null = null;
    if (
      AppBskyEmbedExternal.isMain(record.value.embed) &&
      record.value.embed.external.uri.includes(QUOTE_PARAM)
    ) {
      embed = record.value.embed.external.uri;
    }
    if (
      AppBskyEmbedRecordWithMedia.isMain(record.value.embed) &&
      AppBskyEmbedExternal.isMain(record.value.embed.media) &&
      record.value.embed.media?.external?.uri.includes(QUOTE_PARAM)
    ) {
      embed = record.value.embed.media.external.uri;
    }
    if (embed) {
      console.log(
        "processing post mention: " + embed + " in " + evt.uri.toString(),
      );
      await inngest.send({
        name: "appview/index-bsky-post-mention",
        data: { post_uri: evt.uri.toString(), document_link: embed },
      });
    }
  }
}
