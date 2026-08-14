import { describe, expect, test } from "vitest";
import { normalizeDocument, getDocumentPages } from "lexicons/src/normalize";
import {
  getGatedPostTierIds,
  gateUnlocksWithSubscription,
  getMembersDelimiterTierIds,
  isEntitledToGatedPost,
  resolveUnlockingTierIds,
  tierUnlocksGatedPost,
  truncatePagesAtMembersDelimiter,
} from "src/membership";

const DELIMITER = "pub.leaflet.blocks.membersOnlyDelimiter";

function gatedPages() {
  return [
    {
      $type: "pub.leaflet.pages.linearDocument",
      id: "root",
      blocks: [
        { block: { $type: "pub.leaflet.blocks.text", plaintext: "preview" } },
        { block: { $type: "pub.leaflet.blocks.page", id: "free-sub" } },
        { block: { $type: DELIMITER } },
        { block: { $type: "pub.leaflet.blocks.text", plaintext: "paid" } },
        { block: { $type: "pub.leaflet.blocks.page", id: "paid-sub" } },
      ],
    },
    {
      $type: "pub.leaflet.pages.linearDocument",
      id: "free-sub",
      blocks: [
        { block: { $type: "pub.leaflet.blocks.text", plaintext: "ok" } },
      ],
    },
    {
      $type: "pub.leaflet.pages.linearDocument",
      id: "paid-sub",
      blocks: [
        { block: { $type: "pub.leaflet.blocks.text", plaintext: "secret" } },
      ],
    },
  ];
}

// getPostPageData returns BOTH the normalized document and the raw record it
// was derived from, and gates them with a single in-place truncation. That only
// works because normalizeDocument shares the pages array with the input — if it
// ever starts copying (structuredClone, a deep map), the raw record in the
// client payload would silently ship the gated blocks.
describe("truncatePagesAtMembersDelimiter through normalizeDocument", () => {
  test("pub.leaflet.document: normalized pages alias the raw record's", () => {
    const raw = {
      $type: "pub.leaflet.document",
      title: "Gated",
      author: "did:plc:author",
      publication: "at://did:plc:author/pub.leaflet.publication/pub",
      publishedAt: new Date().toISOString(),
      pages: gatedPages(),
    };
    const normalized = normalizeDocument(
      raw,
      "at://did:plc:author/pub.leaflet.document/rkey",
    );
    const pages = getDocumentPages(normalized!);
    expect(pages).toBe(raw.pages);

    truncatePagesAtMembersDelimiter(pages!);

    // One pass gated both views.
    expect(raw.pages).toHaveLength(2);
    expect(raw.pages[0].blocks).toHaveLength(3);
    expect(raw.pages.map((p) => p.id)).toEqual(["root", "free-sub"]);
    expect(JSON.stringify(raw)).not.toContain("secret");
    expect(JSON.stringify(normalized)).not.toContain("secret");
  });

  test("site.standard.document: normalized pages alias the raw record's", () => {
    const raw = {
      $type: "site.standard.document",
      title: "Gated",
      site: "at://did:plc:author/site.standard.publication/pub",
      publishedAt: new Date().toISOString(),
      content: { $type: "pub.leaflet.content", pages: gatedPages() },
    };
    const normalized = normalizeDocument(raw);
    const pages = getDocumentPages(normalized!);
    expect(pages).toBe(raw.content.pages);

    truncatePagesAtMembersDelimiter(pages!);

    expect(raw.content.pages).toHaveLength(2);
    expect(JSON.stringify(raw)).not.toContain("secret");
    expect(JSON.stringify(normalized)).not.toContain("secret");
  });

  test("keeps the delimiter itself as the paywall anchor", () => {
    const pages = gatedPages();
    truncatePagesAtMembersDelimiter(pages);
    expect(pages[0].blocks.at(-1)!.block.$type).toBe(DELIMITER);
  });
});

describe("isEntitledToGatedPost", () => {
  const owner = "did:plc:owner";
  const contributor = "did:plc:contributor";
  const active = { status: "active", current_period_end: null };

  test("owner reads through", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: owner,
        ownerDid: owner,
        contributors: [],
        membership: null,
      }),
    ).toBe(true);
  });

  test("confirmed contributor reads through", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: contributor,
        ownerDid: owner,
        contributors: [{ contributor_did: contributor, confirmed: true }],
        membership: null,
      }),
    ).toBe(true);
  });

  test("unconfirmed contributor does not", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: contributor,
        ownerDid: owner,
        contributors: [{ contributor_did: contributor, confirmed: false }],
        membership: null,
      }),
    ).toBe(false);
  });

  test("active member reads through, even with no DID", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: null,
        ownerDid: owner,
        contributors: [],
        membership: active,
      }),
    ).toBe(true);
  });

  test("lapsed and canceled memberships do not", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: "did:plc:reader",
        ownerDid: owner,
        contributors: [],
        membership: {
          status: "active",
          current_period_end: new Date(Date.now() - 1000).toISOString(),
        },
      }),
    ).toBe(false);
    expect(
      isEntitledToGatedPost({
        viewerDid: "did:plc:reader",
        ownerDid: owner,
        contributors: [],
        membership: { status: "canceled", current_period_end: null },
      }),
    ).toBe(false);
  });

  test("logged-out reader does not", () => {
    expect(
      isEntitledToGatedPost({
        viewerDid: null,
        ownerDid: owner,
        contributors: [{ contributor_did: contributor, confirmed: true }],
        membership: null,
      }),
    ).toBe(false);
  });
});

describe("tiered gating", () => {
  const owner = "did:plc:owner";
  const free = { id: "free", monthly_price_cents: 0, is_free: true };
  const tiers = [
    free,
    { id: "basic", monthly_price_cents: 500, is_free: false },
    { id: "plus", monthly_price_cents: 1000, is_free: false },
    { id: "premium", monthly_price_cents: 2000, is_free: false },
  ];
  const activeOn = (tier: string | null) => ({
    status: "active",
    current_period_end: null,
    tier,
  });
  const base = {
    viewerDid: null,
    ownerDid: owner,
    contributors: [],
    unlockingTierIds: ["basic", "premium"],
  };

  test("member on an unnamed tier is locked out", () => {
    expect(
      isEntitledToGatedPost({ ...base, membership: activeOn("plus") }),
    ).toBe(false);
  });

  test("members on the named tiers read through, in any price order", () => {
    expect(
      isEntitledToGatedPost({ ...base, membership: activeOn("basic") }),
    ).toBe(true);
    expect(
      isEntitledToGatedPost({ ...base, membership: activeOn("premium") }),
    ).toBe(true);
  });

  test("membership pointing at no tier or a deleted one is locked out", () => {
    expect(isEntitledToGatedPost({ ...base, membership: activeOn(null) })).toBe(
      false,
    );
    expect(
      isEntitledToGatedPost({ ...base, membership: activeOn("gone") }),
    ).toBe(false);
  });

  test("no tier requirement keeps the any-member rule", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        unlockingTierIds: null,
        membership: activeOn("plus"),
      }),
    ).toBe(true);
  });

  test("owner bypasses the tier requirement", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        viewerDid: owner,
        membership: null,
      }),
    ).toBe(true);
  });

  test("a lapsed member on a named tier is still locked out", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        membership: {
          status: "canceled",
          current_period_end: null,
          tier: "premium",
        },
      }),
    ).toBe(false);
  });

  test("resolveUnlockingTierIds keeps the named tiers that still exist", () => {
    expect(resolveUnlockingTierIds(["basic", "gone"], tiers)).toEqual([
      "basic",
    ]);
    expect(resolveUnlockingTierIds(null, tiers)).toBe(null);
  });

  test("resolveUnlockingTierIds falls back to any-member when every named tier is gone", () => {
    expect(resolveUnlockingTierIds(["gone"], tiers)).toBe(null);
  });

  test("tierUnlocksGatedPost matches by id, and only names free explicitly", () => {
    const ids = ["plus", "premium"];
    expect(tierUnlocksGatedPost({ id: "basic", is_free: false }, ids)).toBe(
      false,
    );
    expect(tierUnlocksGatedPost({ id: "plus", is_free: false }, ids)).toBe(
      true,
    );
    expect(tierUnlocksGatedPost({ id: "free", is_free: true }, ids)).toBe(
      false,
    );
    expect(
      tierUnlocksGatedPost({ id: "free", is_free: true }, ["free", "plus"]),
    ).toBe(true);
    expect(tierUnlocksGatedPost({ id: "basic", is_free: false }, null)).toBe(
      true,
    );
    expect(tierUnlocksGatedPost({ id: "free", is_free: true }, null)).toBe(
      false,
    );
  });

  describe("a gate naming the free tier", () => {
    const unlockingTierIds = resolveUnlockingTierIds(
      ["free", "premium"],
      tiers,
    );

    test("resolves to the free tier and reads as subscription-unlocked", () => {
      expect(unlockingTierIds).toEqual(["free", "premium"]);
      expect(gateUnlocksWithSubscription(unlockingTierIds, tiers)).toBe(true);
      expect(gateUnlocksWithSubscription(["premium"], tiers)).toBe(false);
      expect(gateUnlocksWithSubscription(null, tiers)).toBe(false);
    });

    test("a subscriber with no membership reads through", () => {
      expect(
        isEntitledToGatedPost({
          ...base,
          unlockingTierIds,
          subscriptionUnlocks: true,
          isSubscriber: true,
          membership: null,
        }),
      ).toBe(true);
    });

    test("a logged-in non-subscriber does not", () => {
      expect(
        isEntitledToGatedPost({
          ...base,
          unlockingTierIds,
          subscriptionUnlocks: true,
          isSubscriber: false,
          membership: null,
        }),
      ).toBe(false);
    });

    test("an active member on an unnamed tier still reads through", () => {
      // Free is the lowest bar there is, so paying past it can't lock you out
      // — even if the membership somehow has no subscription row.
      expect(
        isEntitledToGatedPost({
          ...base,
          unlockingTierIds,
          subscriptionUnlocks: true,
          isSubscriber: false,
          membership: activeOn("basic"),
        }),
      ).toBe(true);
    });

    test("a lapsed member who never subscribed does not", () => {
      expect(
        isEntitledToGatedPost({
          ...base,
          unlockingTierIds,
          subscriptionUnlocks: true,
          isSubscriber: false,
          membership: {
            status: "canceled",
            current_period_end: null,
            tier: "premium",
          },
        }),
      ).toBe(false);
    });
  });

  test("reads the delimiter's tiers off blocks and documents", () => {
    const blocks = [
      { block: { $type: "pub.leaflet.blocks.text", plaintext: "preview" } },
      { block: { $type: DELIMITER, tiers: ["basic", "premium"] } },
      { block: { $type: "pub.leaflet.blocks.text", plaintext: "paid" } },
    ];
    expect(getMembersDelimiterTierIds(blocks)).toEqual(["basic", "premium"]);
    expect(getMembersDelimiterTierIds(blocks.slice(2))).toBe(null);
    expect(getMembersDelimiterTierIds([{ block: { $type: DELIMITER } }])).toBe(
      null,
    );

    const doc = normalizeDocument(
      {
        $type: "pub.leaflet.document",
        title: "Gated",
        author: "did:plc:author",
        publication: "at://did:plc:author/pub.leaflet.publication/pub",
        publishedAt: new Date().toISOString(),
        pages: [
          {
            $type: "pub.leaflet.pages.linearDocument",
            id: "root",
            blocks,
          },
        ],
      },
      "at://did:plc:author/pub.leaflet.document/rkey",
    );
    expect(getGatedPostTierIds(doc)).toEqual(["basic", "premium"]);
  });
});
