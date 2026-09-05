import { after } from "next/server";
import { tinybird } from "lib/tinybird";

export type ActiveUserRole = "writer" | "reader";
export type ActiveUserSurface = "editor" | "published" | "view_only" | "reader";

// Only signed-in sessions are tracked: the identity row keys the actor so a
// person on several devices counts once, and anonymous traffic is left to the
// Vercel analytics drain.
export type ActiveUserIdentity = { id: string; atp_did?: string | null };

// Deliberately unthrottled: dedupe happens in Tinybird's endpoints, not here.
// Ingestion runs in `after()` so it never blocks or fails the user-facing
// request, which also means this must be called from a Next request context.
export function trackActiveUser(event: {
  identity: ActiveUserIdentity;
  role: ActiveUserRole;
  surface: ActiveUserSurface;
}) {
  if (!process.env.TINYBIRD_TOKEN) return;
  after(async () => {
    try {
      await tinybird.activeUserEvents.ingest({
        timestamp: Date.now(),
        identity_id: event.identity.id,
        did: event.identity.atp_did ?? "",
        role: event.role,
        surface: event.surface,
      });
    } catch (e) {
      console.error("[trackActiveUser] ingest failed:", e);
    }
  });
}
