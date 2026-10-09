import { AtUri } from "@atproto/syntax";
import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getDocumentPages,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";
import { getBylineDids, hasExplicitByline } from "src/utils/byline";
import {
  BROADCAST_PUBLICATION_COLUMNS,
  broadcastPostEmail,
  emailAuthorName,
  emailBodyFromPages,
  loadUnsentSubscribers,
  resolveBroadcastSender,
} from "src/emailPosts/broadcast";

export const send_post_broadcast = inngest.createFunction(
  {
    id: "send_post_broadcast",
    onFailure: async ({ event, error }) => {
      // Exhausted step retries — mark the row as failed so it doesn't
      // sit in `sending` forever. The error surfaces in the Inngest UI too.
      const { publication_uri, document_uri } = event.data.event.data;
      await supabaseServerClient
        .from("publication_post_sends")
        .update({
          status: "failed",
          error: String(error?.message ?? error).slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
    },
    triggers: [events.newsletterPostSendRequested],
  },
  async ({ event, step }) => {
    const { publication_uri, document_uri } = event.data;

    const authorDid = new AtUri(document_uri).host;

    const loaded = await step.run("load-pub-and-doc", async () => {
      const [pubRes, docRes] = await Promise.all([
        supabaseServerClient
          .from("publications")
          .select(BROADCAST_PUBLICATION_COLUMNS)
          .eq("uri", publication_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("documents")
          .select("data")
          .eq("uri", document_uri)
          .maybeSingle(),
      ]);
      return {
        pub: pubRes.data,
        doc: docRes.data,
      };
    });

    const sender = resolveBroadcastSender(loaded.pub);
    if (!sender.ok) {
      await step.run("mark-failed", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "failed",
            error: sender.error,
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { aborted: sender.error };
    }

    const { pubRecord, pubProps } = sender.value;
    const docRecord = normalizeDocumentRecord(loaded.doc?.data, document_uri);
    const postTitle = docRecord?.title || "(untitled)";
    const postDescription = docRecord?.description;
    const postUrl =
      pubRecord?.url && docRecord?.path
        ? `${pubRecord.url.replace(/\/$/, "")}${docRecord.path}`
        : pubProps.publicationUrl;

    // Byline: render contributor names when the doc has an explicit byline,
    // otherwise fall back to the single document author (the URI host DID).
    // A step result of undefined comes back as null.
    const authorName =
      (await step.run("load-byline", () =>
        emailAuthorName(
          authorDid,
          hasExplicitByline(docRecord, authorDid)
            ? getBylineDids(docRecord, authorDid)
            : [],
        ),
      )) ?? undefined;
    const publishedAtLabel = docRecord?.publishedAt
      ? new Date(docRecord.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined;

    const { blocks, pages, rootCanvas } = emailBodyFromPages(
      docRecord ? getDocumentPages(docRecord) ?? [] : [],
    );

    const subscribers = await step.run("snapshot-subscribers", async () => {
      const subs = await loadUnsentSubscribers(publication_uri, {
        key: "document",
        value: document_uri,
      });
      await supabaseServerClient
        .from("publication_post_sends")
        .update({
          status: "sending",
          subscriber_count: subs.length,
          error: null,
          completed_at: null,
        })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
      return subs;
    });

    if (subscribers.length === 0) {
      await step.run("finalize-empty", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "sent",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { sent: 0 };
    }

    await broadcastPostEmail((id, fn) => step.run(id, fn) as Promise<any>, {
      publicationUri: publication_uri,
      authorDid,
      sender: sender.value,
      postTitle,
      postDescription,
      postUrl,
      authorName,
      publishedAtLabel,
      blocks,
      pages,
      rootCanvas,
      recipients: subscribers,
      eventMetadata: { document: document_uri },
    });

    await step.run("finalize", async () => {
      await supabaseServerClient
        .from("publication_post_sends")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
        })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
    });

    return { sent: subscribers.length };
  },
);
