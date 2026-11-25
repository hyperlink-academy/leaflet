import { describe, expect, test } from "vitest";
import {
  QUESTIONS_AUDIENCES,
  readSubmissionAudience,
  toSubmissionAudienceUnion,
} from "src/questionsAudience";

describe("submission audience union", () => {
  test("round-trips every audience", () => {
    for (const audience of QUESTIONS_AUDIENCES) {
      const tierIds = audience === "tiers" ? ["a", "b"] : [];
      expect(
        readSubmissionAudience(toSubmissionAudienceUnion(audience, tierIds)),
      ).toEqual({ audience, tierIds });
    }
  });

  test("anyone is written as an absent audience", () => {
    expect(toSubmissionAudienceUnion("anyone", [])).toBeUndefined();
  });

  test("reads absent and unknown audiences as anyone", () => {
    const anyone = { audience: "anyone", tierIds: [] };
    expect(readSubmissionAudience(undefined)).toEqual(anyone);
    expect(readSubmissionAudience("subscribers")).toEqual(anyone);
    expect(
      readSubmissionAudience({ $type: "pub.leaflet.audience#public" }),
    ).toEqual(anyone);
  });

  test("a tiers audience with malformed tierIds admits no tiers", () => {
    expect(
      readSubmissionAudience({ $type: "pub.leaflet.audience#tiers" }),
    ).toEqual({ audience: "tiers", tierIds: [] });
    expect(
      readSubmissionAudience({
        $type: "pub.leaflet.audience#tiers",
        tierIds: ["a", "a", 1],
      }),
    ).toEqual({ audience: "tiers", tierIds: ["a"] });
  });
});
