import { describe, expect, it } from "vitest";
import ring from "./fixtures/backlinkRing.json";
import { extractLinks, toReviewDocument } from "./content";
import { applyAutoBlock, decide, decideFrom } from "./run";
import { explain } from "./reasons";
import { linksSingleTarget } from "./signals/linksSingleTarget";
import { publishBurst } from "./signals/publishBurst";
import type { AccountBundle } from "./types";

// Three documents from one account of the backlink ring found 2026-11-24:
// generic articles, each carrying one link to a client's site.
const account: AccountBundle = {
  did: "did:plc:5v3kbsqhhfybfj2dt62urgij",
  profile: null,
  publications: [],
  humanLabel: null,
  documents: ring.map((r) =>
    toReviewDocument({
      uri: r.uri,
      publication: null,
      data: r.data,
      sort_date: null,
    }),
  ),
};
const ctx = { db: { query: async () => ({ rows: [] }) }, now: new Date() };

describe("content", () => {
  it("reads prose and one outbound site per ring document", () => {
    for (let doc of account.documents) {
      expect(doc.chars).toBeGreaterThan(1000);
      expect(new Set(doc.links.map((l) => l.domain)).size).toBe(1);
    }
  });

  it("drops the document's own home and common platforms", () => {
    let domains = account.documents.flatMap((d) =>
      d.links.map((l) => l.domain),
    );
    expect(domains).not.toContain("leaflet.pub");
    expect(
      extractLinks([
        "https://en.wikipedia.org/wiki/Skip",
        "https://bsky.app/x",
      ]),
    ).toEqual([]);
  });

  it("treats a site on shared hosting as its own domain", () => {
    expect(extractLinks(["https://someone.github.io/post"])[0].domain).toBe(
      "someone.github.io",
    );
  });
});

describe("signals", () => {
  it("links.single_target_share is 1 for the ring", async () => {
    expect((await linksSingleTarget.compute(account, ctx, {})).value).toBe(1);
  });

  it("publish.burst counts documents inside one hour", async () => {
    let docs = ["10:00", "10:20", "10:59", "12:30"].map((t, i) => ({
      ...account.documents[0],
      uri: `at://x/y/${i}`,
      publishedAt: `2026-11-20T${t}:00.000Z`,
    }));
    let result = await publishBurst.compute(
      { ...account, documents: docs },
      ctx,
      {},
    );
    expect(result.value).toBe(3);
  });
});

describe("policy", () => {
  const empty = { "account.profile": "empty", "links.single_target_share": 1 };

  it("proposes spam for an account devoted to an admin-flagged site", () => {
    expect(decide({ ...empty, "links.spam_domains": 1 })).toEqual({
      status: "spam",
      rule: "known-spam-site",
      block: true,
    });
  });

  it("sends the backlink ring to a person", () => {
    expect(decide({ ...empty, "links.shared_domains": 3 })).toEqual({
      status: "needs_review",
      rule: "link-ring",
      block: false,
    });
  });

  it("clears an established writer who shares link targets", () => {
    expect(
      decide({
        "account.profile": "established",
        "links.single_target_share": 0.2,
        "links.shared_domains": 4,
      }),
    ).toMatchObject({ status: "cleared" });
  });

  it("asks for the costly signal when the cheap ones don't settle it", () => {
    expect(decide({ "account.profile": "thin" })).toEqual({
      rule: "content-check",
      missing: ["content.llm"],
    });
    expect(
      decide({ "account.profile": "thin", "content.llm": "legit" }),
    ).toEqual({ status: "cleared", rule: "llm-legit", block: false });
  });

  it("lets the link rules block on their own, but not the model", () => {
    expect(
      decide({ "account.profile": "empty", "links.farm_accounts": 99 }),
    ).toMatchObject({ rule: "link-farm", block: true });
    expect(
      decide({ "account.profile": "thin", "content.llm": "spam" }),
    ).toEqual({ status: "spam", rule: "llm-spam", block: false });
  });
});

describe("auto-block", () => {
  const decision = {
    status: "spam" as const,
    rule: "link-farm",
    reasons: [],
    block: true,
  };
  // Records the statements sent and answers the update as if it matched.
  const fakeDb = () => {
    let sent: string[] = [];
    return {
      sent,
      query: async (text: string) => {
        sent.push(text);
        return { rows: text.includes("update review_subjects") ? [{}] : [] };
      },
    };
  };

  it("does nothing while the switch is off", async () => {
    let db = fakeDb();
    expect(await applyAutoBlock(db, "did:plc:x", decision, "run", false)).toBe(
      false,
    );
    expect(db.sent).toEqual([]);
  });

  it("does nothing for a rule that may not block", async () => {
    let db = fakeDb();
    expect(
      await applyAutoBlock(
        db,
        "did:plc:x",
        { ...decision, block: false },
        "r",
        true,
      ),
    ).toBe(false);
    expect(db.sent).toEqual([]);
  });

  it("blocks and logs it, skipping accounts an admin cleared", async () => {
    let db = fakeDb();
    expect(await applyAutoBlock(db, "did:plc:x", decision, "run", true)).toBe(
      true,
    );
    expect(db.sent[0]).toContain("human_label is distinct from 'legit'");
    expect(db.sent[0]).toContain("enforced_status is null");
    expect(db.sent[1]).toContain("'enforcement', 'block'");
  });
});

describe("reasons", () => {
  const farm = {
    "account.profile": {
      value: "empty",
      evidence: { followers: 0, posts: 5 },
    },
    "publish.burst": { value: 5 },
    "links.single_target_share": {
      value: 1,
      evidence: { singleTarget: 5, documents: 5 },
    },
    "links.farm_accounts": {
      value: 99,
      evidence: { domain: "certsland.com" },
    },
  };

  it("lists every reason that applies, strongest first", () => {
    expect(explain(farm).map((r) => r.code)).toEqual([
      "link_farm",
      "backlink_posts",
      "burst",
      "empty_profile",
    ]);
  });

  it("names the site a farm reason is about", () => {
    expect(explain(farm)[0]).toMatchObject({ site: "certsland.com" });
  });

  it("a decision carries its reasons whatever rule matched", () => {
    let decision = decideFrom(farm);
    expect(decision).toMatchObject({ status: "spam", rule: "link-farm" });
    expect(decision.reasons.length).toBe(4);
  });

  it("an account still waiting on the model is unjudged, not in the queue", () => {
    let decision = decideFrom({ "account.profile": { value: "thin" } });
    expect(decision).toMatchObject({
      status: "unjudged",
      rule: "content-check",
    });
    expect(decision.reasons).toEqual([]);
  });
});
