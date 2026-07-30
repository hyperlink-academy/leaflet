"use server";
import { getIdentityData } from "actions/getIdentityData";
import { hydrateNotifications } from "src/notifications";
import { supabaseServerClient } from "supabase/serverClient";

export async function getNotifications(limit?: number) {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return [];
  let query = supabaseServerClient
    .from("notifications")
    .select("*")
    .eq("recipient", identity.atp_did)
    .order("created_at", { ascending: false });
  if (limit) query.limit(limit);
  let { data } = await query;
  let notifications = await hydrateNotifications(data || []);
  return notifications;
}

export async function markAsRead() {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return [];
  await supabaseServerClient
    .from("notifications")
    .update({ read: true })
    .eq("recipient", identity.atp_did);
  return;
}
