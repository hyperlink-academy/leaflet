export const PRODUCT_DEF_ID = "leaflet_pro_v1";

export const PRODUCT_DEFINITION = {
  name: "Leaflet Pro",
  metadata: {
    product_def_id: PRODUCT_DEF_ID,
    entitlements: JSON.stringify({ publication_analytics: true }),
  },
};

export const PRICE_DEFINITIONS = {
  month: {
    lookup_key: "leaflet_pro_monthly_v1_usd",
    unit_amount: 1200,
    currency: "usd",
    recurring: { interval: "month" as const },
  },
  year: {
    lookup_key: "leaflet_pro_yearly_v1_usd",
    unit_amount: 12000,
    currency: "usd",
    recurring: { interval: "year" as const },
  },
};

// Populated at runtime by sync script or looked up dynamically
export const PRICE_IDS: Record<"month" | "year", string> = {
  month: process.env.STRIPE_PRICE_MONTHLY_ID || "",
  year: process.env.STRIPE_PRICE_YEARLY_ID || "",
};

export function parseEntitlements(
  metadata: Record<string, string> | null,
): Record<string, boolean> {
  if (!metadata?.entitlements) return {};
  try {
    return JSON.parse(metadata.entitlements);
  } catch {
    return {};
  }
}
