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

export async function getPriceId(
  cadence: "month" | "year",
): Promise<string | null> {
  const { getStripe } = await import("./client");
  const key = PRICE_DEFINITIONS[cadence].lookup_key;
  const prices = await getStripe().prices.list({ lookup_keys: [key] });
  return prices.data[0]?.id ?? null;
}

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
