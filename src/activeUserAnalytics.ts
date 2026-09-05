import { tinybird } from "lib/tinybird";

export type ActiveUserRole = "writer" | "reader";
export type ActiveUserSurface = "editor" | "published" | "view_only" | "reader";

// Only signed-in sessions are tracked: the identity row keys the actor so a
// person on several devices counts once, and anonymous traffic is left to the
// Vercel analytics drain.
export type ActiveUserIdentity = { id: string; atp_did?: string | null };

// Deliberately unthrottled: dedupe happens in Tinybird (the active_users_daily
// rollup), not here. Wrap calls in `after()` so ingestion never blocks or
// fails the user-facing request.
export async function trackActiveUser(event: {
  identity: ActiveUserIdentity;
  role: ActiveUserRole;
  surface: ActiveUserSurface;
  entity?: string | null;
}): Promise<void> {
  if (!process.env.TINYBIRD_TOKEN) return;
  try {
    await tinybird.activeUserEvents.ingest({
      timestamp: Date.now(),
      identity_id: event.identity.id,
      did: event.identity.atp_did ?? "",
      role: event.role,
      surface: event.surface,
      entity: event.entity ?? "",
    });
  } catch (e) {
    console.error("[trackActiveUser] ingest failed:", e);
  }
}
