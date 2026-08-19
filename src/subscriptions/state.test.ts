import { describe, expect, test } from "vitest";
import { deriveSubscriptionState } from "src/subscriptions/state";

const publication = "at://did:plc:publisher/pub.leaflet.publication/example";

describe("publication subscription and membership state", () => {
  test("an existing subscriber is a free member", () => {
    const subscription = deriveSubscriptionState(publication, {
      subscriptions: [{ publication }],
    });

    expect(subscription).toMatchObject({
      subscribed: true,
      membership: { kind: "free" },
    });
  });

  test("a confirmed email-only subscriber resolves the same way", () => {
    const subscription = deriveSubscriptionState(publication, {
      emailSubscribers: [{ publication, state: "confirmed" }],
    });

    expect(subscription.membership).toEqual({ kind: "free" });
  });

  test("an active paid row becomes the explicit membership and counts as subscribed", () => {
    const subscription = deriveSubscriptionState(publication, {
      memberships: [
        {
          publication,
          tier: "supporter",
          status: "active",
          current_period_end: null,
        },
      ],
    });

    expect(subscription.subscribed).toBe(true);
    expect(subscription.membership).toEqual({
      kind: "paid",
      tierId: "supporter",
    });
  });

  test("an inactive paid row falls back to free only while subscribed", () => {
    const subscription = deriveSubscriptionState(publication, {
      subscriptions: [{ publication }],
      memberships: [
        {
          publication,
          tier: "supporter",
          status: "canceled",
          current_period_end: null,
        },
      ],
    });

    expect(subscription.membership).toEqual({ kind: "free" });
  });

  test("an inactive paid row without a subscription is not a membership", () => {
    const subscription = deriveSubscriptionState(publication, {
      memberships: [
        {
          publication,
          tier: "supporter",
          status: "canceled",
          current_period_end: null,
        },
      ],
    });

    expect(subscription.subscribed).toBe(false);
    expect(subscription.membership).toBeNull();
  });
});
