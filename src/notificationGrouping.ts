import type {
  HydratedNotification,
  HydratedRecommendNotification,
  HydratedSubscribeNotification,
} from "src/notifications";

// Modeled on Bluesky's notification grouping: interactions of the same kind on
// the same subject collapse into one "X people [actioned]" item. Grouping runs
// per fetched page (groups never span pages), so items and their keys stay
// stable as further pages load.
const GROUP_WINDOW_MS = 1000 * 60 * 60 * 48;

export type GroupableNotification =
  | HydratedSubscribeNotification
  | HydratedRecommendNotification;

export type NotificationGroup = {
  // head notification id — stable across refetches, used as the React key
  id: string;
  type: GroupableNotification["type"];
  // newest first; the head sets the group's timestamp and 48h window
  notifications: GroupableNotification[];
};

export type NotificationListItem =
  | { kind: "single"; notification: HydratedNotification }
  | { kind: "group"; group: NotificationGroup };

function groupKey(n: HydratedNotification): string | null {
  if (n.type === "subscribe")
    return `subscribe:${n.subscriptionData.publication}`;
  if (n.type === "recommend") return `recommend:${n.document_uri}`;
  return null;
}

function actorDid(n: GroupableNotification): string | null {
  if (n.type === "subscribe") return n.subscriptionData.identity;
  return n.recommendData.recommender_did;
}

export function groupNotifications(
  notifications: HydratedNotification[],
): NotificationListItem[] {
  let items: NotificationListItem[] = [];
  let openGroups = new Map<string, NotificationGroup>();
  for (let n of notifications) {
    let key = groupKey(n);
    if (key === null) {
      items.push({ kind: "single", notification: n });
      continue;
    }
    let groupable = n as GroupableNotification;
    let group = openGroups.get(key);
    let headTime = group
      ? new Date(group.notifications[0].created_at).getTime()
      : 0;
    if (
      group &&
      headTime - new Date(n.created_at).getTime() < GROUP_WINDOW_MS
    ) {
      // duplicate actions by the same actor (e.g. unsubscribe/resubscribe)
      // collapse into their newest occurrence
      let did = actorDid(groupable);
      if (did === null || group.notifications.every((m) => actorDid(m) !== did))
        group.notifications.push(groupable);
      continue;
    }
    let newGroup: NotificationGroup = {
      id: n.id,
      type: groupable.type,
      notifications: [groupable],
    };
    openGroups.set(key, newGroup);
    items.push({ kind: "group", group: newGroup });
  }
  return items;
}
