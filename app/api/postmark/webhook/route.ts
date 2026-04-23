import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseServerClient } from "supabase/serverClient";
import type { Json } from "supabase/database.types";

// Postmark webhook endpoint.
//
// Authentication: Basic Auth via the webhook URL configured in Postmark.
// Postmark doesn't ship an HMAC signing scheme for webhooks; the official
// pattern is `https://user:pass@host/path`. We accept any username; the
// password is compared constant-time against POSTMARK_WEBHOOK_SECRET.
//
// Response: we always return 200 (including on internal errors) so Postmark
// doesn't retry and duplicate events. Failures are logged server-side.
//
// Dispatch:
//   Bounce           → append `bounce`; HardBounce also flips state to unsubscribed
//   SpamComplaint    → append `complaint` + flip to unsubscribed
//   SubscriptionChange → mirror Postmark's list — flip to unsubscribed across
//                       all rows for that email (the stream is shared) and
//                       append `unsubscribe_requested`. Idempotent on
//                       already-unsubscribed rows.
//   Delivery / Open / Click → ignored (revisit when we want analytics)

type SubscriberRow = {
  id: string;
  state: string;
  publication: string;
};

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[postmark webhook] POSTMARK_WEBHOOK_SECRET not set; rejecting",
    );
    return false;
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  const password = colon >= 0 ? decoded.slice(colon + 1) : decoded;
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function findSubscriberById(
  metadata: { subscriber_id?: string } | undefined,
): Promise<SubscriberRow | null> {
  if (!metadata?.subscriber_id) return null;
  const { data } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, state, publication")
    .eq("id", metadata.subscriber_id)
    .maybeSingle();
  return data ?? null;
}

async function findSubscribersByEmail(
  email: string,
): Promise<SubscriberRow[]> {
  const { data } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, state, publication")
    .eq("email", email.toLowerCase());
  return data ?? [];
}

async function flipToUnsubscribed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .update({
      state: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      confirmation_code: null,
    })
    .in("id", ids);
  if (error) {
    console.error("[postmark webhook] state flip failed:", error);
  }
}

async function appendEvents(
  rows: Array<{
    subscriber: string;
    publication: string;
    event_type: string;
    metadata?: Json;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabaseServerClient
    .from("publication_email_subscriber_events")
    .insert(rows);
  if (error) {
    console.error("[postmark webhook] event insert failed:", error);
  }
}

async function handleBounce(body: any): Promise<void> {
  const metadata = body.Metadata as
    | { subscriber_id?: string; publication?: string }
    | undefined;
  const email = (body.Email ?? "").toString();
  const bounceType = (body.Type ?? "") as string;
  const isHard = bounceType === "HardBounce";

  let target = await findSubscriberById(metadata);
  if (!target && email) {
    // Fallback: match by email + publication if metadata was stripped.
    const rows = await findSubscribersByEmail(email);
    const pub = metadata?.publication;
    target = pub ? (rows.find((r) => r.publication === pub) ?? null) : null;
  }
  if (!target) {
    console.warn(
      "[postmark webhook] bounce: no subscriber match",
      metadata,
      email,
    );
    return;
  }

  const eventMetadata: Json = {
    type: bounceType,
    message_id: body.MessageID ?? null,
    description: body.Description ?? null,
  } as unknown as Json;

  await appendEvents([
    {
      subscriber: target.id,
      publication: target.publication,
      event_type: "bounce",
      metadata: eventMetadata,
    },
  ]);
  if (isHard && target.state !== "unsubscribed") {
    await flipToUnsubscribed([target.id]);
  }
}

async function handleSpamComplaint(body: any): Promise<void> {
  const metadata = body.Metadata as
    | { subscriber_id?: string; publication?: string }
    | undefined;
  const email = (body.Email ?? "").toString();

  let target = await findSubscriberById(metadata);
  if (!target && email) {
    const rows = await findSubscribersByEmail(email);
    const pub = metadata?.publication;
    target = pub ? (rows.find((r) => r.publication === pub) ?? null) : null;
  }
  if (!target) {
    console.warn(
      "[postmark webhook] complaint: no subscriber match",
      metadata,
      email,
    );
    return;
  }

  const eventMetadata: Json = {
    message_id: body.MessageID ?? null,
  } as unknown as Json;

  await appendEvents([
    {
      subscriber: target.id,
      publication: target.publication,
      event_type: "complaint",
      metadata: eventMetadata,
    },
  ]);
  if (target.state !== "unsubscribed") {
    await flipToUnsubscribed([target.id]);
  }
}

async function handleSubscriptionChange(body: any): Promise<void> {
  // Stream-shared suppression — unsubscribe every row for this email,
  // regardless of which publication triggered Postmark's change.
  const email = (body.Recipient ?? body.Email ?? "").toString();
  if (!email) return;

  const rows = await findSubscribersByEmail(email);
  if (rows.length === 0) return;

  const active = rows.filter((r) => r.state !== "unsubscribed");
  if (active.length === 0) return; // already unsubscribed — idempotent no-op

  const reason = (body.SuppressionReason ?? null) as string | null;
  const origin = (body.Origin ?? null) as string | null;
  const eventMetadata: Json = {
    source: "postmark_webhook",
    reason,
    origin,
    message_id: body.MessageID ?? null,
  } as unknown as Json;

  await flipToUnsubscribed(active.map((r) => r.id));
  await appendEvents(
    active.map((r) => ({
      subscriber: r.id,
      publication: r.publication,
      event_type: "unsubscribe_requested",
      metadata: eventMetadata,
    })),
  );
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[postmark webhook] bad json:", e);
    // Postmark sent a malformed body — 200 so they don't retry forever.
    return new NextResponse(null, { status: 200 });
  }

  try {
    switch (body?.RecordType) {
      case "Bounce":
        await handleBounce(body);
        break;
      case "SpamComplaint":
        await handleSpamComplaint(body);
        break;
      case "SubscriptionChange":
        await handleSubscriptionChange(body);
        break;
      // Delivery, Open, Click intentionally ignored.
      default:
        break;
    }
  } catch (e) {
    console.error(
      "[postmark webhook] handler threw:",
      body?.RecordType,
      e,
    );
  }

  return new NextResponse(null, { status: 200 });
}
