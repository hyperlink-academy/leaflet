import { describe, expect, test } from "vitest";
import {
  daysUntilLabel,
  isWiderReleasePending,
  widerReleaseReaches,
  getMembersDelimiterGatePolicy,
  getWiderReleasePolicy,
  isEarlyAccessPending,
  toAudienceUnion,
  pageHasMembersDelimiter,
  truncateBlocksAtMembersDelimiter,
  widerReleaseTimeline,
  widerReleaseAudience,
  type AudiencePolicy,
} from "src/membership";

const DELIMITER = "pub.leaflet.blocks.membersOnlyDelimiter";
const TEXT = { block: { $type: "pub.leaflet.blocks.text", plaintext: "x" } };

function pages(delimiter: Record<string, unknown>) {
  return [
    {
      $type: "pub.leaflet.pages.linearDocument",
      blocks: [TEXT, { block: { $type: DELIMITER, ...delimiter } }, TEXT],
    },
  ];
}

const PUBLISHED = "2026-01-31T12:00:00.000Z";

describe("toAudienceUnion", () => {
  test("round-trips through the parser", () => {
    const policies: AudiencePolicy[] = [
      { audience: "public" },
      { audience: "subscribers" },
      { audience: "paid" },
      { audience: "tiers", tierIds: ["a", "b"] },
    ];
    for (const policy of policies) {
      expect(
        getWiderReleasePolicy({
          $type: DELIMITER,
          widerReleaseAt: PUBLISHED,
          widerReleaseAudience: toAudienceUnion(policy),
        }),
      ).toEqual(policy);
    }
  });
});

describe("widerReleaseTimeAfter", () => {
  test("adds days and calendar months", () => {
    expect(widerReleaseTimeline(PUBLISHED, "day")).toBe(
      "2026-02-01T12:00:00.000Z",
    );
    expect(widerReleaseTimeline(PUBLISHED, "week")).toBe(
      "2026-02-07T12:00:00.000Z",
    );
    expect(widerReleaseTimeline(PUBLISHED, "two-weeks")).toBe(
      "2026-02-14T12:00:00.000Z",
    );
    expect(widerReleaseTimeline("2026-03-10T00:00:00.000Z", "month")).toBe(
      "2026-04-10T00:00:00.000Z",
    );
    expect(widerReleaseTimeline("not a date", "day")).toBeNull();
  });
});

describe("early access gating", () => {
  const widerReleaseAt = "2026-02-01T00:00:00.000Z";
  const before = new Date(widerReleaseAt).getTime() - 1;
  const after = new Date(widerReleaseAt).getTime();

  test("a public wider release lifts the gate only once widerReleaseAt passes", () => {
    const p = pages({
      audience: "subscribers",
      widerReleaseAt,
      widerReleaseAudience: { $type: `${DELIMITER}#public` },
    });
    expect(pageHasMembersDelimiter(p[0], before)).toBe(true);
    expect(pageHasMembersDelimiter(p[0], after)).toBe(false);
    expect(truncateBlocksAtMembersDelimiter(p[0].blocks, before)).toHaveLength(
      1,
    );
    expect(truncateBlocksAtMembersDelimiter(p[0].blocks, after)).toHaveLength(
      3,
    );
  });

  test("a non-public wider release widens the policy without lifting the gate", () => {
    const p = pages({
      audience: "tiers",
      tierIds: ["a"],
      widerReleaseAt,
      widerReleaseAudience: { $type: `${DELIMITER}#subscribers` },
    });
    expect(getMembersDelimiterGatePolicy(p[0].blocks, before)).toEqual({
      audience: "tiers",
      tierIds: ["a"],
    });
    expect(getMembersDelimiterGatePolicy(p[0].blocks, after)).toEqual({
      audience: "subscribers",
    });
    expect(pageHasMembersDelimiter(p[0], after)).toBe(true);
  });

  test("a narrower delayed audience never removes readers", () => {
    const p = pages({
      audience: "subscribers",
      widerReleaseAt,
      widerReleaseAudience: { $type: `${DELIMITER}#tiers`, tierIds: ["a"] },
    });
    expect(getMembersDelimiterGatePolicy(p[0].blocks, after)).toEqual({
      audience: "subscribers",
    });
  });

  test("early access is pending only before widerReleaseAt", () => {
    const p = pages({
      audience: "paid",
      widerReleaseAt,
      widerReleaseAudience: { $type: `${DELIMITER}#public` },
    });
    expect(isEarlyAccessPending(p[0].blocks, before)).toBe(true);
    expect(isEarlyAccessPending(p[0].blocks, after)).toBe(false);
    expect(isEarlyAccessPending(pages({ audience: "paid" })[0].blocks)).toBe(
      false,
    );
  });

  test("an Unlock Content gate is unaffected by time", () => {
    const p = pages({ audience: "paid" });
    const muchLater = after + 365 * 24 * 60 * 60 * 1000;
    expect(pageHasMembersDelimiter(p[0], muchLater)).toBe(true);
    expect(getMembersDelimiterGatePolicy(p[0].blocks, muchLater)).toEqual({
      audience: "paid",
    });
    expect(isEarlyAccessPending(p[0].blocks, before)).toBe(false);
    expect(
      truncateBlocksAtMembersDelimiter(p[0].blocks, muchLater),
    ).toHaveLength(1);
  });

  test("a wider-release audience without widerReleaseAt is ignored", () => {
    const p = pages({
      audience: "paid",
      widerReleaseAudience: { $type: `${DELIMITER}#public` },
    });
    expect(pageHasMembersDelimiter(p[0], after)).toBe(true);
    expect(isEarlyAccessPending(p[0].blocks, before)).toBe(false);
    expect(getMembersDelimiterGatePolicy(p[0].blocks, after)).toEqual({
      audience: "paid",
    });
  });

  test("widening tier selections unions them", () => {
    expect(
      widerReleaseAudience(
        { audience: "tiers", tierIds: ["a"] },
        { audience: "tiers", tierIds: ["b", "a"] },
      ),
    ).toEqual({ audience: "tiers", tierIds: ["a", "b"] });
  });
});

describe("release countdown", () => {
  const now = new Date("2026-02-01T00:00:00.000Z").getTime();
  const release = (at: string) => ({
    at,
    audience: { audience: "public" as const },
  });

  test("rounds part-days up and never says 0", () => {
    expect(daysUntilLabel("2026-02-08T00:00:00.000Z", now)).toBe("7 days");
    expect(daysUntilLabel("2026-02-07T01:00:00.000Z", now)).toBe("7 days");
    expect(daysUntilLabel("2026-02-01T01:00:00.000Z", now)).toBe("1 day");
  });

  test("is pending only before the release", () => {
    expect(
      isWiderReleasePending(release("2026-02-02T00:00:00.000Z"), now),
    ).toBe(true);
    expect(
      isWiderReleasePending(release("2026-02-01T00:00:00.000Z"), now),
    ).toBe(false);
    expect(isWiderReleasePending(null, now)).toBe(false);
  });
});

describe("widerReleaseReaches", () => {
  const now = new Date("2026-02-01T00:00:00.000Z").getTime();
  const at = "2026-02-08T00:00:00.000Z";
  const free = { kind: "free" as const };
  const tierB = { kind: "paid" as const, tierId: "b" };
  const gate = { audience: "tiers" as const, tierIds: ["a"] };

  test("reaches readers the widened audience admits", () => {
    const toPaid = { at, audience: { audience: "paid" as const } };
    expect(widerReleaseReaches(tierB, gate, toPaid, now)).toBe(true);
    expect(widerReleaseReaches(free, gate, toPaid, now)).toBe(false);
    expect(widerReleaseReaches(null, gate, toPaid, now)).toBe(false);
  });

  test("a public release reaches everyone, but only while pending", () => {
    const toPublic = { at, audience: { audience: "public" as const } };
    expect(widerReleaseReaches(null, gate, toPublic, now)).toBe(true);
    expect(
      widerReleaseReaches(null, gate, toPublic, new Date(at).getTime()),
    ).toBe(false);
  });
});
