import { createHash } from "crypto";
import { AtUri } from "@atproto/syntax";
import { tinybird } from "lib/tinybird";
import type { SubscriptionSource } from "src/subscriptionSource";

// Framework-free (no next/server imports) so the appview firehose consumer can
// call it directly. In Next.js request contexts, wrap calls in `after()` so
// ingestion never blocks or fails the user-facing action.
export async function trackSubscriptionEvent(event: {
  event: "subscribe" | "unsubscribe";
  method: "atproto" | "email";
  origin: "app" | "firehose";
  publicationUri: string;
  subscriberDid?: string | null;
  subscriberEmail?: string | null;
  recordUri?: string | null;
  source?: SubscriptionSource | null;
}): Promise<void> {
  if (!process.env.TINYBIRD_TOKEN) return;
  let publicationDid = "";
  try {
    publicationDid = new AtUri(event.publicationUri).host;
  } catch {}
  const subscriber = event.subscriberDid
    ? event.subscriberDid
    : event.subscriberEmail
      ? createHash("sha256")
          .update(event.subscriberEmail.trim().toLowerCase())
          .digest("hex")
      : "";
  try {
    await tinybird.subscriptionEvents.ingest({
      timestamp: Date.now(),
      event: event.event,
      method: event.method,
      origin: event.origin,
      publication_uri: event.publicationUri,
      publication_did: publicationDid,
      subscriber,
      record_uri: event.recordUri ?? "",
      source_placement: event.source?.placement ?? "",
      source_publication: event.source?.publication ?? "",
      source_url: event.source?.url ?? "",
    });
  } catch (e) {
    console.error("[trackSubscriptionEvent] ingest failed:", e);
  }
}
