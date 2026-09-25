// Countries where a publisher can hold a full-dashboard, Stripe-liable
// connected account. This is the subset of Stripe's Country Specs with a
// non-empty `supported_bank_account_currencies` — the remaining specs are
// cross-border-payout-only countries, which can't take card payments on a
// full-dashboard account. Pure module so the client-side picker can import it.
export const STRIPE_CONNECT_COUNTRIES = [
  "AE",
  "AT",
  "AU",
  "BE",
  "BG",
  "BR",
  "CA",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GI",
  "GR",
  "HK",
  "HR",
  "HU",
  "IE",
  "IN",
  "IT",
  "JP",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "MX",
  "MY",
  "NL",
  "NO",
  "NZ",
  "PL",
  "PT",
  "RO",
  "SE",
  "SG",
  "SI",
  "SK",
  "TH",
  "US",
] as const;

export type StripeConnectCountry = (typeof STRIPE_CONNECT_COUNTRIES)[number];

export function isStripeConnectCountry(
  value: unknown,
): value is StripeConnectCountry {
  return (
    typeof value === "string" &&
    (STRIPE_CONNECT_COUNTRIES as readonly string[]).includes(value)
  );
}
