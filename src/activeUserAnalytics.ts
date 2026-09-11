import { after } from "next/server";
import { tinybird } from "lib/tinybird";
import { supabaseServerClient } from "supabase/serverClient";
import { keyEntitlements } from "./identityPayload";
import { isPro, PRO_ENTITLEMENT_KEY } from "./entitlements";
import type { SubscriptionSource } from "./subscriptionSource";
import { getAuthIdentity } from "./auth";

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
  | "publish" // published a document; props publication, document, first_publish, blocks
  | "create_publication" // props publication
  | "signup" // identity row created; props method (email | bluesky), source
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
