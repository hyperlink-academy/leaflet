"use server";
import { getAuthIdentity } from "src/auth";
import {
  getNotificationPage,
  type NotificationCursor,
  type NotificationPage,
} from "src/notificationQueries";
import { supabaseServerClient } from "supabase/serverClient";

export async function getNotifications(
  cursor?: NotificationCursor | null,
): Promise<NotificationPage> {
  let identity = await getAuthIdentity();
  if (!identity?.atp_did) return { items: [], nextCursor: null };
  return getNotificationPage(identity.atp_did, cursor);
}

export async function markAsRead() {
  let identity = await getAuthIdentity();
  if (!identity?.atp_did) return [];
  await supabaseServerClient
    .from("notifications")
    .update({ read: true })
    .eq("recipient", identity.atp_did)
    .eq("read", false);
  return;
}
