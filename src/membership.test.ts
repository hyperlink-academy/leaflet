import { describe, expect, test } from "vitest";
import { getDocumentPages, normalizeDocument } from "lexicons/src/normalize";
import {
  buildMembershipTiers,
  getGatedPostPolicy,
  getMembersDelimiterGatePolicy,
  isEntitledToGatedPost,
  membershipUnlocksGatedPost,
  resolvePublicationMembership,
  truncatePagesAtMembersDelimiter,
  type GatePolicy,
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
        { block: { $type: DELIMITER, audience: "paid" } },
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
// ever starts copying, the raw record could silently ship the gated blocks.
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

describe("gate policy parsing", () => {
  const blocksWith = (block: Record<string, unknown>) => [
    { block: { $type: "pub.leaflet.blocks.text" } },
    { block: { $type: DELIMITER, ...block } },
  ];

  test.each([
    ["subscribers", { audience: "subscribers" }],
    ["paid", { audience: "paid" }],
  ] as const)("parses the %s audience", (audience, expected) => {
    expect(getMembersDelimiterGatePolicy(blocksWith({ audience }))).toEqual(
      expected,
    );
  });

  test("parses and deduplicates selected paid tier ids", () => {
    expect(
      getMembersDelimiterGatePolicy(
        blocksWith({ audience: "tiers", tierIds: ["plus", "plus", "pro"] }),
      ),
    ).toEqual({ audience: "tiers", tierIds: ["plus", "pro"] });
  });

  test("keeps an empty selected-tier policy explicit", () => {
    expect(
      getMembersDelimiterGatePolicy(
        blocksWith({ audience: "tiers", tierIds: [] }),
      ),
    ).toEqual({ audience: "tiers", tierIds: [] });
  });

  test("rejects unknown and malformed policies", () => {
    expect(
      getMembersDelimiterGatePolicy(blocksWith({ audience: "unknown" })),
    ).toBe(null);
    expect(
      getMembersDelimiterGatePolicy(
        blocksWith({ audience: "tiers", tierIds: "plus" }),
      ),
    ).toBe(null);
    expect(
      getMembersDelimiterGatePolicy(blocksWith({ audience: "tiers" })),
    ).toBe(null);
  });

  test("falls back to the pre-audience lexicon shape", () => {
    // No `audience`, no `tiers`: the old lexicon's default of every paid tier.
    expect(getMembersDelimiterGatePolicy(blocksWith({}))).toEqual({
      audience: "paid",
    });
    expect(
      getMembersDelimiterGatePolicy(blocksWith({ tiers: ["plus", "pro"] })),
    ).toEqual({ audience: "tiers", tierIds: ["plus", "pro"] });
    // An empty legacy selection serialized the same as absent.
    expect(getMembersDelimiterGatePolicy(blocksWith({ tiers: [] }))).toEqual({
      audience: "paid",
    });
    expect(
      getMembersDelimiterGatePolicy(blocksWith({ tiers: "plus" })),
    ).toBe(null);
  });

  test("reads the policy from the document's first page", () => {
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
            blocks: blocksWith({
              audience: "tiers",
              tierIds: ["plus", "pro"],
            }),
          },
        ],
      },
      "at://did:plc:author/pub.leaflet.document/rkey",
    );
    expect(getGatedPostPolicy(doc)).toEqual({
      audience: "tiers",
      tierIds: ["plus", "pro"],
    });
  });
});

describe("resolvePublicationMembership", () => {
  const activeOn = (tier: string) => ({
    status: "active",
    current_period_end: null,
    tier,
  });

  test("resolves a subscriber without a billing row to free", () => {
    expect(
      resolvePublicationMembership({
        isSubscriber: true,
        paidMembership: null,
      }),
    ).toEqual({ kind: "free" });
  });

  test("prefers an active paid membership", () => {
    expect(
      resolvePublicationMembership({
        isSubscriber: true,
        paidMembership: activeOn("plus"),
      }),
    ).toEqual({ kind: "paid", tierId: "plus" });
  });

  test("treats a trialing membership as paid", () => {
    expect(
      resolvePublicationMembership({
        isSubscriber: false,
        paidMembership: {
          status: "trialing",
          current_period_end: null,
          tier: "plus",
        },
      }),
    ).toEqual({ kind: "paid", tierId: "plus" });
  });

  test("falls back to free when the paid membership lapses", () => {
    expect(
      resolvePublicationMembership({
        isSubscriber: true,
        paidMembership: {
          status: "canceled",
          current_period_end: null,
          tier: "plus",
        },
      }),
    ).toEqual({ kind: "free" });
  });

  test("does not resolve an active row past its period end", () => {
    expect(
      resolvePublicationMembership({
        isSubscriber: false,
        paidMembership: {
          status: "active",
          current_period_end: new Date(Date.now() - 1_000).toISOString(),
          tier: "plus",
        },
      }),
    ).toBe(null);
  });
});

describe("buildMembershipTiers", () => {
  test("synthesizes the subscriber plan and exposes only active paid tiers", () => {
    expect(
      buildMembershipTiers(
        {
          subscriber_tier_name: "Reader",
          subscriber_tier_description: "Follow along",
        },
        [
          {
            id: "later",
            name: "Later",
            description: null,
            monthly_price_cents: 1000,
            annual_price_cents: null,
            active: true,
            sort_order: 2,
          },
          {
            id: "inactive",
            name: "Inactive",
            description: null,
            monthly_price_cents: 500,
            annual_price_cents: null,
            active: false,
            sort_order: 0,
          },
          {
            id: "first",
            name: "First",
            description: "First paid plan",
            monthly_price_cents: 700,
            annual_price_cents: 7000,
            active: true,
            sort_order: 1,
          },
        ],
      ),
    ).toEqual({
      subscriber: { name: "Reader", description: "Follow along" },
      paid: [
        {
          id: "first",
          name: "First",
          description: "First paid plan",
          monthly_price_cents: 700,
          annual_price_cents: 7000,
        },
        {
          id: "later",
          name: "Later",
          description: null,
          monthly_price_cents: 1000,
          annual_price_cents: null,
        },
      ],
    });
  });
});

describe("membershipUnlocksGatedPost", () => {
  const free = { kind: "free" } as const;
  const basic = { kind: "paid", tierId: "basic" } as const;
  const plus = { kind: "paid", tierId: "plus" } as const;

  test("paid members inherit subscriber access", () => {
    const policy = { audience: "subscribers" } as const;
    expect(membershipUnlocksGatedPost(free, policy)).toBe(true);
    expect(membershipUnlocksGatedPost(basic, policy)).toBe(true);
  });

  test("a paid gate rejects free and accepts every paid tier", () => {
    const policy = { audience: "paid" } as const;
    expect(membershipUnlocksGatedPost(free, policy)).toBe(false);
    expect(membershipUnlocksGatedPost(basic, policy)).toBe(true);
    expect(membershipUnlocksGatedPost(plus, policy)).toBe(true);
  });

  test("a selected-tier gate accepts only the named paid tiers", () => {
    const policy: GatePolicy = { audience: "tiers", tierIds: ["plus"] };
    expect(membershipUnlocksGatedPost(free, policy)).toBe(false);
    expect(membershipUnlocksGatedPost(basic, policy)).toBe(false);
    expect(membershipUnlocksGatedPost(plus, policy)).toBe(true);
  });

  test("unknown and empty policies fail closed", () => {
    expect(membershipUnlocksGatedPost(plus, null)).toBe(false);
    expect(
      membershipUnlocksGatedPost(plus, {
        audience: "tiers",
        tierIds: [],
      }),
    ).toBe(false);
  });
});

describe("isEntitledToGatedPost", () => {
  const owner = "did:plc:owner";
  const contributor = "did:plc:contributor";
  const activeOn = (tier: string) => ({
    status: "active",
    current_period_end: null,
    tier,
  });
  const base = {
    viewerDid: null,
    ownerDid: owner,
    contributors: [] as {
      contributor_did: string;
      confirmed: boolean | null;
    }[],
    paidMembership: null,
    isSubscriber: false,
    gatePolicy: { audience: "paid" } as GatePolicy,
  };

  test("owner and confirmed contributor bypass the membership policy", () => {
    expect(isEntitledToGatedPost({ ...base, viewerDid: owner })).toBe(true);
    expect(
      isEntitledToGatedPost({
        ...base,
        viewerDid: contributor,
        contributors: [{ contributor_did: contributor, confirmed: true }],
      }),
    ).toBe(true);
  });

  test("unconfirmed and logged-out contributors do not bypass it", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        viewerDid: contributor,
        contributors: [{ contributor_did: contributor, confirmed: false }],
      }),
    ).toBe(false);
    expect(
      isEntitledToGatedPost({
        ...base,
        contributors: [{ contributor_did: contributor, confirmed: true }],
      }),
    ).toBe(false);
  });

  test("resolves subscriber access inside the entitlement decision", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        isSubscriber: true,
        gatePolicy: { audience: "subscribers" },
      }),
    ).toBe(true);
    expect(
      isEntitledToGatedPost({
        ...base,
        isSubscriber: true,
        gatePolicy: { audience: "paid" },
      }),
    ).toBe(false);
  });

  test("resolves active paid access inside the entitlement decision", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        paidMembership: activeOn("plus"),
        gatePolicy: { audience: "tiers", tierIds: ["plus"] },
      }),
    ).toBe(true);
    expect(
      isEntitledToGatedPost({
        ...base,
        paidMembership: activeOn("basic"),
        gatePolicy: { audience: "tiers", tierIds: ["plus"] },
      }),
    ).toBe(false);
  });

  test("a lapsed paid membership falls back to subscriber access only", () => {
    const paidMembership = {
      status: "canceled",
      current_period_end: null,
      tier: "plus",
    };
    expect(
      isEntitledToGatedPost({
        ...base,
        isSubscriber: true,
        paidMembership,
        gatePolicy: { audience: "subscribers" },
      }),
    ).toBe(true);
    expect(
      isEntitledToGatedPost({
        ...base,
        isSubscriber: true,
        paidMembership,
        gatePolicy: { audience: "paid" },
      }),
    ).toBe(false);
  });

  test("an invalid policy fails closed for members but not the owner", () => {
    expect(
      isEntitledToGatedPost({
        ...base,
        paidMembership: activeOn("plus"),
        gatePolicy: null,
      }),
    ).toBe(false);
    expect(
      isEntitledToGatedPost({
        ...base,
        viewerDid: owner,
        gatePolicy: null,
      }),
    ).toBe(true);
  });
});
