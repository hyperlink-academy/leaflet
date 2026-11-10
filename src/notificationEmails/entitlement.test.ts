import { describe, expect, it } from "vitest";
import {
  canUseEmailNotifications,
  EMAIL_NOTIFICATION_ENTITLEMENT_KEY,
  KNOWN_ENTITLEMENT_KEYS,
} from "src/entitlements";

describe("email notification entitlement", () => {
  it("is available in the admin feature flag list", () => {
    expect(EMAIL_NOTIFICATION_ENTITLEMENT_KEY).toBe(
      "email_notification_enabled",
    );
    expect(KNOWN_ENTITLEMENT_KEYS).toContain(
      EMAIL_NOTIFICATION_ENTITLEMENT_KEY,
    );
  });
  it("requires an explicit grant", () => {
    expect(canUseEmailNotifications({ email_notification_enabled: {} })).toBe(
      true,
    );
    expect(
      canUseEmailNotifications({ publication_analytics: {}, payments: {} }),
    ).toBe(false);
    expect(canUseEmailNotifications(null)).toBe(false);
    expect(canUseEmailNotifications(undefined)).toBe(false);
  });
});
