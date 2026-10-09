import { after } from "next/server";
import { headers } from "next/headers";
import { tinybird } from "lib/tinybird";
import { supabaseServerClient } from "supabase/serverClient";
import { keyEntitlements } from "./identityPayload";
import { isPro, PRO_ENTITLEMENT_KEY } from "./entitlements";
import {
  sanitizeSubscriptionSource,
  type SubscriptionSource,
} from "./subscriptionSource";
import { getAuthIdentity } from "./auth";
import type { ActionAfterSignIn } from "app/api/oauth/[route]/afterSignInActions";

// Active-user counts are "distinct identities with any event"; finer questions
// (who moved from reading to writing) are query-time filters on `event` and
// `properties`, so add event names and properties freely rather than columns.
export type UserEvent =
  | "page_view" // client beacon on every route change (see actions/trackPageView.ts)
  | "push" // ran replicache mutations
  // Subscribe/unsubscribe props: publication, method, record_uri,
  // source_placement, source_publication, source_url.
  | "subscribe"
  | "unsubscribe"
  | "publish" // published a document; props publication, document, first_publish, blocks, scheduled ("true" when a scheduled publish went out)
  | "send_email_post" // saved an email-only post; props publication, send_mode (now | scheduled | on_subscribe), audience
  | "schedule_post" // scheduled a post to publish later; props publication, publish_at, first_schedule ("false" for a reschedule)
  | "create_publication" // props publication
  | "comment" // commented on a published document; props document, record_uri, reply ("true" for a reply to another comment)
  | "signup" // identity row created; props method (email | bluesky), plus signupSourceProperties
  | "create_document" // props kind (doc | canvas | template | duplicate | publication_draft), publication
  | "pro_upgrade" // Leaflet Pro checkout completed; props plan
  | "pro_cancel" // Leaflet Pro subscription ended
  | "join_membership" // paid membership became active; props publication, tier, cadence, source_placement
  | "connect_onboarding_started" // creator created a Stripe Connect account
  | "connect_account_enabled"; // creator's connected account can take charges

export function subscriptionSourceProperties(
  source: SubscriptionSource | null | undefined,
) {
  return {
    source_placement: source?.placement ?? "",
    source_publication: source?.publication ?? "",
    source_url: source?.url ?? "",
  };
}

// A server action's Referer is the page that called it. Flows that complete
// after a redirect (OAuth, email login) stamp the url client-side instead, and
// their cross-site Referer (the auth server) is ignored.
export async function subscriptionSourceFromRequest(source: unknown) {
  const sanitized = sanitizeSubscriptionSource(source);
  if (sanitized?.url) return sanitized;
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  if (!referer) return sanitized;
  try {
    if (new URL(referer).host !== requestHeaders.get("host")) return sanitized;
  } catch {
    return sanitized;
  }
  return sanitizeSubscriptionSource({ ...sanitized, url: referer });
}

// Where a signup started: `source` names the flow (an after-sign-in action or
// e.g. "membership"), the action's target is linked as publication/document,
// and source_url is the page sign-in began on. Fields can come from the
// client, so they're type-checked and length-limited like subscribe sources.
export function signupSourceProperties(args: {
  flow?: string;
  action?: ActionAfterSignIn | null;
  page?: string | null;
}): Record<string, string> {
  const { action } = args;
  const props: Record<string, string> = {
    source: String(args.flow ?? action?.action ?? "").slice(0, 64),
  };
  let source: unknown = { url: args.page ?? undefined };
  if (
    action?.action === "subscribe" &&
    typeof action.publication === "string" &&
    action.publication.length <= 512
  ) {
    props.publication = action.publication;
    source = { url: args.page ?? undefined, ...action.source };
  } else if (
    action?.action === "recommend" &&
    typeof action.document === "string" &&
    action.document.length <= 512
  )
    props.document = action.document;
  return {
    ...props,
    ...subscriptionSourceProperties(sanitizeSubscriptionSource(source)),
  };
}

// Document creation actions resolve the caller from the auth cookie in SQL and
// never load the identity themselves; this looks it up off the request path.
// Anonymous creations are not tracked.
export function trackDocumentCreated(properties: Record<string, string>) {
  if (!process.env.TINYBIRD_TOKEN) return;
  after(async () => {
    const identity = await getAuthIdentity();
    if (identity)
      await ingestUserEvent(identity, "create_document", properties);
  });
}

// Only signed-in sessions are tracked: the identity row keys the actor so a
// person on several devices counts once, and anonymous traffic is left to the
// Vercel analytics drain.
export type TrackedIdentity = { id: string; atp_did?: string | null };

// Deliberately unthrottled: dedupe happens in Tinybird's endpoints, not here.
// Ingestion runs in `after()` so it never blocks or fails the user-facing
// request, which also means this must be called from a Next request context.
export function trackUserEvent(
  identity: TrackedIdentity,
  event: UserEvent,
  properties: Record<string, string> = {},
) {
  if (!process.env.TINYBIRD_TOKEN) return;
  after(() => ingestUserEvent(identity, event, properties));
}

// For background jobs, which have no request to keep fast and may run
// outside the request context `after()` needs.
export async function recordUserEvent(
  identity: TrackedIdentity,
  event: UserEvent,
  properties: Record<string, string> = {},
) {
  if (!process.env.TINYBIRD_TOKEN) return;
  await ingestUserEvent(identity, event, properties);
}

async function ingestUserEvent(
  identity: TrackedIdentity,
  event: UserEvent,
  properties: Record<string, string>,
) {
  try {
    await tinybird.userEvents.ingest({
      timestamp: Date.now(),
      identity_id: identity.id,
      did: identity.atp_did ?? "",
      event,
      properties: new Map(
        Object.entries({ ...properties, ...(await proProperties(identity)) }),
      ),
    });
  } catch (e) {
    console.error("[trackUserEvent] ingest failed:", e);
  }
}

// Stamped on every event so the active-user pipes can split by Pro status as
// it was at the time, rather than joining today's status onto old rows. Looked
// up here instead of at the call sites because none of them load entitlements,
// and running inside `after()` keeps it off the request path. A failed lookup
// leaves the row unstamped (counted as free) rather than losing the event.
async function proProperties(identity: TrackedIdentity) {
  const { data, error } = await supabaseServerClient
    .from("user_entitlements")
    .select("entitlement_key, granted_at, expires_at, source, metadata")
    .eq("identity_id", identity.id)
    .eq("entitlement_key", PRO_ENTITLEMENT_KEY);
  if (error) {
    console.error("[trackUserEvent] entitlement lookup failed:", error);
    return {};
  }
  const entitlements = keyEntitlements(data);
  return {
    pro: String(isPro(entitlements)),
    pro_source: entitlements[PRO_ENTITLEMENT_KEY]?.source ?? "",
  };
}
