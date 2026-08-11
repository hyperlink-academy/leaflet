import { describe, expect, test } from "vitest";
import { deriveConnectedAccountStatus } from "./accountStatus";

describe("deriveConnectedAccountStatus", () => {
  test("charges_enabled wins regardless of requirements", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: true,
        requirements: { pending_verification: ["individual.id_number"] },
      }),
    ).toBe("active");
  });

  test("fresh account with nothing synced is onboarding_incomplete", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: null,
      }),
    ).toBe("onboarding_incomplete");
  });

  test("outstanding currently_due is onboarding_incomplete", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: {
          currently_due: ["individual.verification.document"],
          disabled_reason: "requirements.past_due",
        },
      }),
    ).toBe("onboarding_incomplete");
  });

  test("details submitted with only pending_verification is under_review", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: {
          currently_due: [],
          past_due: [],
          pending_verification: ["individual.id_number"],
          disabled_reason: "requirements.pending_verification",
        },
      }),
    ).toBe("under_review");
  });

  test("under_review disabled_reason with empty lists is under_review", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: {
          currently_due: [],
          pending_verification: [],
          disabled_reason: "under_review",
        },
      }),
    ).toBe("under_review");
  });

  test("user action outstanding beats a concurrent review", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: {
          currently_due: ["individual.verification.document"],
          pending_verification: ["individual.id_number"],
        },
      }),
    ).toBe("onboarding_incomplete");
  });

  test("rejected.* disabled_reasons are rejected", () => {
    for (const reason of [
      "rejected.fraud",
      "rejected.terms_of_service",
      "rejected.listed",
      "rejected.other",
    ]) {
      expect(
        deriveConnectedAccountStatus({
          charges_enabled: false,
          requirements: { disabled_reason: reason },
        }),
      ).toBe("rejected");
    }
  });

  test("unrecognized disabled_reason falls back to onboarding_incomplete", () => {
    expect(
      deriveConnectedAccountStatus({
        charges_enabled: false,
        requirements: { disabled_reason: "platform_paused" },
      }),
    ).toBe("onboarding_incomplete");
  });
});
