import { describe, expect, it } from "vitest";
import { groupNotifications } from "./notificationGrouping";
import type { HydratedNotification } from "./notifications";

const HOUR = 1000 * 60 * 60;
const t = (hoursAgo: number) =>
  new Date(Date.parse("2026-07-31T12:00:00Z") - hoursAgo * HOUR).toISOString();

const recommend = (
  id: string,
  document_uri: string,
  created_at: string,
  did = `did:plc:${id}`,
) =>
  ({
    id,
    created_at,
    type: "recommend",
    document_uri,
    recommendData: { recommender_did: did },
  }) as unknown as HydratedNotification;

const subscribe = (
  id: string,
  publication: string,
  created_at: string,
  did = `did:plc:${id}`,
) =>
  ({
    id,
    created_at,
    type: "subscribe",
    subscriptionData: { publication, identity: did },
  }) as unknown as HydratedNotification;

const comment = (id: string, created_at: string) =>
  ({ id, created_at, type: "comment" }) as unknown as HydratedNotification;

describe("groupNotifications", () => {
  it("groups same-kind interactions on the same subject", () => {
    let items = groupNotifications([
      recommend("a", "at://doc/1", t(0)),
      recommend("b", "at://doc/1", t(1)),
      subscribe("c", "at://pub/1", t(2)),
      subscribe("d", "at://pub/1", t(3)),
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "group",
      group: { id: "a", type: "recommend" },
    });
    if (items[0].kind !== "group") throw new Error();
    expect(items[0].group.notifications.map((n) => n.id)).toEqual(["a", "b"]);
    expect(items[1]).toMatchObject({
      kind: "group",
      group: { id: "c", type: "subscribe" },
    });
  });

  it("does not group across different subjects or kinds", () => {
    let items = groupNotifications([
      recommend("a", "at://doc/1", t(0)),
      recommend("b", "at://doc/2", t(1)),
      subscribe("c", "at://pub/1", t(2)),
      subscribe("d", "at://pub/2", t(3)),
    ]);
    expect(items).toHaveLength(4);
  });

  it("keeps non-groupable notifications as singles in order", () => {
    let items = groupNotifications([
      recommend("a", "at://doc/1", t(0)),
      comment("b", t(1)),
      recommend("c", "at://doc/1", t(2)),
    ]);
    expect(items.map((i) => i.kind)).toEqual(["group", "single"]);
    if (items[0].kind !== "group") throw new Error();
    expect(items[0].group.notifications.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("starts a new group past the 48h window, measured from the group head", () => {
    let items = groupNotifications([
      recommend("a", "at://doc/1", t(0)),
      recommend("b", "at://doc/1", t(47)),
      recommend("c", "at://doc/1", t(49)),
      // within 48h of c (the new head), though 96h from a
      recommend("d", "at://doc/1", t(96)),
    ]);
    expect(items).toHaveLength(2);
    if (items[0].kind !== "group" || items[1].kind !== "group")
      throw new Error();
    expect(items[0].group.notifications.map((n) => n.id)).toEqual(["a", "b"]);
    expect(items[1].group.notifications.map((n) => n.id)).toEqual(["c", "d"]);
  });

  it("dedupes repeat actions by the same actor to their newest occurrence", () => {
    let items = groupNotifications([
      subscribe("a", "at://pub/1", t(0), "did:plc:alice"),
      subscribe("b", "at://pub/1", t(1), "did:plc:bob"),
      subscribe("c", "at://pub/1", t(2), "did:plc:alice"),
    ]);
    expect(items).toHaveLength(1);
    if (items[0].kind !== "group") throw new Error();
    expect(items[0].group.notifications.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("uses stable head ids for group identity", () => {
    let notifications = [
      recommend("a", "at://doc/1", t(0)),
      recommend("b", "at://doc/1", t(1)),
    ];
    let first = groupNotifications(notifications);
    let second = groupNotifications(notifications);
    if (first[0].kind !== "group" || second[0].kind !== "group")
      throw new Error();
    expect(first[0].group.id).toEqual(second[0].group.id);
  });
});
