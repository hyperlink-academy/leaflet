import Stripe from "stripe";
import { PRODUCT_DEF_ID, PRODUCT_DEFINITION, PRICE_DEFINITIONS } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
});

async function sync() {
  console.log("Syncing Stripe products and prices...");

  // Find or create product
  let product: Stripe.Product | undefined;
  const existing = await stripe.products.search({
    query: `metadata["product_def_id"]:"${PRODUCT_DEF_ID}"`,
  });

  if (existing.data.length > 0) {
    product = existing.data[0];
    console.log(`Found existing product: ${product.id}`);
    // Update if name or metadata changed
    product = await stripe.products.update(product.id, {
      name: PRODUCT_DEFINITION.name,
      metadata: PRODUCT_DEFINITION.metadata,
    });
    console.log(`Updated product: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: PRODUCT_DEFINITION.name,
      metadata: PRODUCT_DEFINITION.metadata,
    });
    console.log(`Created product: ${product.id}`);
  }

  // Sync prices by lookup_key
  for (const [cadence, def] of Object.entries(PRICE_DEFINITIONS)) {
    const existingPrices = await stripe.prices.list({
      lookup_keys: [def.lookup_key],
    });

    if (existingPrices.data.length > 0) {
      console.log(
        `Price "${def.lookup_key}" already exists: ${existingPrices.data[0].id}`,
      );
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: def.unit_amount,
        currency: def.currency,
        recurring: def.recurring,
        lookup_key: def.lookup_key,
      });
      console.log(`Created price "${def.lookup_key}": ${price.id}`);
    }
  }

  console.log("Sync complete.");
}

sync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
