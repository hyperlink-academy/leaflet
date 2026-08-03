import { supabaseServerClient } from "supabase/serverClient";
import { hydrateNotifications } from "src/notifications";
import {
  groupNotifications,
  type NotificationListItem,
} from "src/notificationGrouping";

export type NotificationCursor = {
  created_at: string;
  id: string;
};

export type NotificationPage = {
  items: NotificationListItem[];
  nextCursor: NotificationCursor | null;
};

// raw rows per page; hydration drops rows whose subject was deleted and
// grouping collapses further, so a page may render fewer items — the
// infinite-scroll sentinel refills short pages
const PAGE_SIZE = 30;

export async function getNotificationPage(
  recipient: string,
  cursor?: NotificationCursor | null,
): Promise<NotificationPage> {
  let query = supabaseServerClient
    .from("notifications")
    .select("*")
    .eq("recipient", recipient)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  let { data } = await query;
  let rows = data || [];
  let hydrated = await hydrateNotifications(rows);
  // cursor comes from the raw rows, not the hydrated ones — hydration drops
  // rows whose subject was deleted and those still advance the window
  let nextCursor =
    rows.length === PAGE_SIZE
      ? {
          created_at: rows[rows.length - 1].created_at,
          id: rows[rows.length - 1].id,
        }
      : null;
  return { items: groupNotifications(hydrated), nextCursor };
}
