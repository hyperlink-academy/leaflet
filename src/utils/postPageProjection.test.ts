import { describe, expect, test } from "vitest";
import {
  projectDocumentRowForClient,
  projectPublicationForClient,
} from "src/utils/postPageProjection";

// Keys that must never reach a client payload: draft_leaflet and
// leaflets_in_publications.leaflet are both permission_tokens ids that
// /[leaflet_id] grants edit access on with no auth check, and the
// subscription/member/contributor embeds are reader PII.
const FORBIDDEN = [
  "draft_leaflet",
  "leaflets_in_publications",
  "leaflet",
  "publication_subscriptions",
  "publication_email_subscribers",
  "publication_memberships",
  "publication_contributors",
];

function keysDeep(value: unknown, found = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const v of value) keysDeep(v, found);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      found.add(k);
      keysDeep(v, found);
    }
  }
  return found;
}

// A row shaped like the widest thing the query has ever selected, so the test
// fails if the projection ever goes back to spreading.
const rawPub = {
  uri: "at://did:plc:owner/pub.leaflet.publication/pub",
  name: "Pub",
  identity_did: "did:plc:owner",
  record: { $type: "pub.leaflet.publication", name: "Pub" },
  draft_leaflet: "c0ffee00-0000-4000-8000-000000000000",
  indexed_at: "2026-01-01T00:00:00Z",
  publication_newsletter_settings: { enabled: true },
  publication_membership_settings: { enabled: true },
  publication_subscriptions: [
    { uri: "at://did:plc:reader/sub/1", identity: "did:plc:reader" },
  ],
  publication_contributors: [
    { contributor_did: "did:plc:contributor", confirmed: true },
  ],
  documents_in_publications: [{ documents: { uri: "at://sibling", data: {} } }],
};

const row = {
  uri: "at://did:plc:owner/pub.leaflet.document/rkey",
  data: { $type: "pub.leaflet.document", title: "Post" },
  documents_in_publications: [{ publications: rawPub }],
  leaflets_in_publications: [
    {
      leaflet: "leaflet-id",
      scheduled_publish_data: { secret: true },
      preferences: { showComments: false },
    },
  ],
  comments_on_documents: [{ record: { text: "hi" } }],
};

describe("post page client projection", () => {
  test("drops the permission token and reader PII", () => {
    const keys = keysDeep([
      projectDocumentRowForClient(row),
      projectPublicationForClient(rawPub),
    ]);
    for (const key of FORBIDDEN) expect([...keys]).not.toContain(key);
  });

  test("keeps only what PostHeader reads off the raw relations", () => {
    const projected = projectDocumentRowForClient(row);
    expect(Object.keys(projected).sort()).toEqual([
      "data",
      "documents_in_publications",
      "uri",
    ]);
    expect(
      Object.keys(projected.documents_in_publications[0].publications).sort(),
    ).toEqual(["identity_did", "name", "record", "uri"]);
  });

  test("publication context exposes the newsletter flag, not the rows", () => {
    expect(projectPublicationForClient(rawPub)).toEqual({
      uri: rawPub.uri,
      name: "Pub",
      identity_did: "did:plc:owner",
      record: rawPub.record,
      newsletterMode: true,
    });
    expect(projectPublicationForClient(null)).toBe(null);
  });
});
