import { after } from "next/server";
import { tinybird } from "lib/tinybird";

// Active-user counts are "distinct identities with any event"; finer questions
// (who moved from reading to writing) are query-time filters on `event` and
// `properties`, so add event names and properties freely rather than columns.
export type UserEvent =
  | "page_view" // client beacon on every route change (see actions/trackPageView.ts)
  | "push"; // ran replicache mutations

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
  after(async () => {
    try {
      await tinybird.userEvents.ingest({
        timestamp: Date.now(),
        identity_id: identity.id,
        did: identity.atp_did ?? "",
        event,
        properties: new Map(Object.entries(properties)),
      });
    } catch (e) {
      console.error("[trackUserEvent] ingest failed:", e);
    }
  });
}
