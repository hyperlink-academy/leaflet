import { describe, expect, test } from "vitest";
import { normalizeDocument, getDocumentPages } from "lexicons/src/normalize";
import {
  isEntitledToGatedPost,
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
