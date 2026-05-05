import { render } from "@react-email/render";
import { AtUri } from "@atproto/syntax";
import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { PostEmail } from "emails/post";
import { emailPropsFromPublication } from "emails/fromPublication";
import {
  getDocumentPages,
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import {
  buildFromHeader,
  resolveFromDomain,
  resolveReplyToEmail,
} from "src/utils/newsletterSender";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import type { Json } from "supabase/database.types";

const BATCH_SIZE = 500;
// Distinctive URL used once at render-time and string-replaced per recipient
// so we only pay the React Email render cost once per batch.
const UNSUB_PLACEHOLDER =
  "https://placeholder.leaflet.pub/unsubscribe-token-replace-me";

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
      const [pubRes, docRes, profileRes] = await Promise.all([
        supabaseServerClient
          .from("publications")
          .select(
            "record, publication_domains(domain), publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at)",
          )
          .eq("uri", publication_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("documents")
          .select("data")
          .eq("uri", document_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("bsky_profiles")
          .select("handle")
          .eq("did", authorDid)
          .maybeSingle(),
      ]);
      return {
        pub: pubRes.data,
        doc: docRes.data,
        profile: profileRes.data,
      };
    });

    const settings = loaded.pub?.publication_newsletter_settings;
    if (!loaded.pub || !settings?.enabled) {
      await step.run("mark-failed-not-enabled", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "failed",
            error: "newsletter_not_enabled",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { aborted: "newsletter_not_enabled" };
    }

    const pubRecord = normalizePublicationRecord(loaded.pub.record);
    const docRecord = normalizeDocumentRecord(loaded.doc?.data, document_uri);
    const pubProps = emailPropsFromPublication(pubRecord);
    const postTitle = docRecord?.title || "(untitled)";
    const postDescription = docRecord?.description;
    const postUrl =
      pubRecord?.url && docRecord?.path
        ? `${pubRecord.url.replace(/\/$/, "")}${docRecord.path}`
        : pubProps.publicationUrl;
    const fromDomain = resolveFromDomain(
      pubRecord?.url,
      loaded.pub.publication_domains?.[0]?.domain,
    );
    if (!fromDomain) {
      await step.run("mark-failed-no-from-address", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "failed",
            error: "no_from_address",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { aborted: "no_from_address" };
    }
    const fromHeader = buildFromHeader(pubRecord?.name, fromDomain);
    const replyToEmail = resolveReplyToEmail(settings);
    const did = authorDid;
    const authorName = loaded.profile?.handle ?? undefined;
    const publishedAtLabel = docRecord?.publishedAt
      ? new Date(docRecord.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined;

    // The first page is the document body. Canvas pages don't map to a linear
    // email body — the email renders an empty postContent section and falls
    // back to the "See Full Post" link.
    const firstPage = docRecord ? getDocumentPages(docRecord)?.[0] : undefined;
    const blocks: PubLeafletPagesLinearDocument.Block[] =
      firstPage?.$type === "pub.leaflet.pages.linearDocument"
        ? (firstPage as PubLeafletPagesLinearDocument.Main).blocks ?? []
        : [];

    const subscribers = await step.run("snapshot-subscribers", async () => {
      const { data } = await supabaseServerClient
        .from("publication_email_subscribers")
        .select("id, email, unsubscribe_token")
        .eq("publication", publication_uri)
        .eq("state", "confirmed");
      const subs = data ?? [];
      await supabaseServerClient
        .from("publication_post_sends")
        .update({ status: "sending", subscriber_count: subs.length })
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

    const assetsBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"
    ).replace(/\/$/, "");

    // Render once with a placeholder, then string-replace per recipient.
    const htmlTemplate = await step.run("render-template", async () => {
      return render(
        PostEmail({
          ...pubProps,
          postTitle,
          postDescription,
          postUrl,
          authorName,
          publishedAtLabel,
          blocks,
          did,
          assetsBaseUrl: `${assetsBaseUrl}/`,
          unsubscribeUrl: UNSUB_PLACEHOLDER,
        }),
      );
    });

    const chunks: (typeof subscribers)[] = [];
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      chunks.push(subscribers.slice(i, i + BATCH_SIZE));
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      const batchResults = await step.run(
        `send-batch-${ci}`,
        async (): Promise<
          { subscriber_id: string; ok: boolean; code: number; message: string }[]
        > => {
          const messages = chunk.map((sub) => {
            const unsubscribeUrl = `${assetsBaseUrl}/emails/unsubscribe?unsubscribe_token=${encodeURIComponent(
              sub.unsubscribe_token,
            )}`;
            const htmlBody = htmlTemplate.split(UNSUB_PLACEHOLDER).join(
              unsubscribeUrl,
            );
            return {
              MessageStream: "broadcast",
              From: fromHeader,
              ReplyTo: replyToEmail,
              To: sub.email,
              Subject: postTitle,
              HtmlBody: htmlBody,
              Headers: [
                {
                  Name: "List-Unsubscribe-Post",
                  Value: "List-Unsubscribe=One-Click",
                },
                {
                  Name: "List-Unsubscribe",
                  Value: `<${unsubscribeUrl}>`,
                },
              ],
              Metadata: {
                subscriber_id: sub.id,
                publication: publication_uri,
              },
            };
          });

          const res = await fetch(
            "https://api.postmarkapp.com/email/batch",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
              },
              body: JSON.stringify(messages),
            },
          );
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            // Throwing triggers Inngest step-retry for transport failures.
            throw new Error(
              `Postmark /email/batch ${res.status}: ${body.slice(0, 500)}`,
            );
          }
          const raw = (await res.json()) as Array<{
            ErrorCode: number;
            Message: string;
          }>;
          return chunk.map((sub, i) => ({
            subscriber_id: sub.id,
            ok: raw[i]?.ErrorCode === 0,
            code: raw[i]?.ErrorCode ?? -1,
            message: raw[i]?.Message ?? "no response",
          }));
        },
      );

      await step.run(`log-events-${ci}`, async () => {
        const rows = batchResults.map((r) => ({
          subscriber: r.subscriber_id,
          publication: publication_uri,
          event_type: r.ok ? "post_sent" : "send_failed",
          metadata: (r.ok
            ? { document: document_uri }
            : {
                document: document_uri,
                code: r.code,
                message: r.message,
              }) as unknown as Json,
        }));
        const { error } = await supabaseServerClient
          .from("publication_email_subscriber_events")
          .insert(rows);
        if (error) {
          console.error(
            "[send_post_broadcast] event insert failed:",
            error,
          );
        }
      });

      // Partial per-recipient failures (ErrorCode !== 0) don't count as
      // a terminal failure — the row still transitions to `sent`. Per-recipient
      // failure signal lives in the event log. Transport-level batch failures
      // throw above and exhaust retries into the function's onFailure handler.
    }

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
