import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";

export type WalletRow = {
  identity_id: string;
  stripe_customer_id: string;
  default_payment_method_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
};

type WalletIdentity = { id: string; email?: string | null };

// The platform wallet: one platform Customer per reader holding a card saved
// off-session. That card is cloned to each publisher's connected account at join
// time. Reuse the Leaflet Pro customer when one exists so a reader never
// accumulates duplicate platform customers.
export async function getOrCreateWallet(
  identity: WalletIdentity,
): Promise<WalletRow> {
  const { data: existing } = await supabaseServerClient
    .from("stripe_wallets")
    .select("*")
    .eq("identity_id", identity.id)
    .maybeSingle();
  if (existing) return existing;

  const { data: proSub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("identity_id", identity.id)
    .maybeSingle();

  let customerId = proSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await getStripe().customers.create(
      {
        email: identity.email || undefined,
        metadata: { identity_id: identity.id, kind: "leaflet_wallet" },
      },
      { idempotencyKey: `wallet-customer-${identity.id}` },
    );
    customerId = customer.id;
  }

  const { data: upserted, error } = await supabaseServerClient
    .from("stripe_wallets")
    .upsert(
      {
        identity_id: identity.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "identity_id" },
    )
    .select("*")
    .single();
  if (error || !upserted) {
    console.error("[wallet] upsert failed:", error);
    throw new Error("Failed to create wallet");
  }
  return upserted;
}

// Attach a freshly collected card to the platform customer, make it the wallet
// default, and cache its display fields for the "Join with ···4242" UI.
export async function saveWalletCard(
  identityId: string,
  paymentMethodId: string,
): Promise<WalletRow> {
  const { data: wallet } = await supabaseServerClient
    .from("stripe_wallets")
    .select("*")
    .eq("identity_id", identityId)
    .maybeSingle();
  if (!wallet) throw new Error("No wallet for identity");

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  // A SetupIntent with `customer` set attaches on confirmation; only attach if
  // it isn't already on the platform customer.
  if (pm.customer !== wallet.stripe_customer_id) {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: wallet.stripe_customer_id,
    });
  }
  await stripe.customers.update(wallet.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const card = pm.card;
  const { data: updated, error } = await supabaseServerClient
    .from("stripe_wallets")
    .update({
      default_payment_method_id: paymentMethodId,
      card_brand: card?.brand ?? null,
      card_last4: card?.last4 ?? null,
      card_exp_month: card?.exp_month ?? null,
      card_exp_year: card?.exp_year ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("identity_id", identityId)
    .select("*")
    .single();
  if (error || !updated) {
    console.error("[wallet] card save failed:", error);
    throw new Error("Failed to save wallet card");
  }
  return updated;
}

// Clone a platform-customer card onto a connected account (Stripe's cross-account
// payment method cloning). Returns the connected-account PM id — not yet attached
// to any connected-account customer.
export async function cloneCardToAccount(
  walletPmId: string,
  platformCustomerId: string,
  stripeAccount: string,
): Promise<string> {
  const cloned = await getStripe().paymentMethods.create(
    { customer: platformCustomerId, payment_method: walletPmId },
    { stripeAccount },
  );
  return cloned.id;
}

// The reader's customer on a publisher's connected account, reused across all of
// that publisher's publications.
export async function getOrCreateConnectedCustomer(
  identity: WalletIdentity,
  stripeAccount: string,
): Promise<string> {
  const { data: existing } = await supabaseServerClient
    .from("stripe_connected_customers")
    .select("stripe_customer_id")
    .eq("identity_id", identity.id)
    .eq("stripe_account_id", stripeAccount)
    .maybeSingle();
  if (existing) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create(
    {
      email: identity.email || undefined,
      metadata: { identity_id: identity.id, kind: "leaflet_member" },
    },
    {
      stripeAccount,
      idempotencyKey: `connected-customer-${identity.id}-${stripeAccount}`,
    },
  );
  const { error } = await supabaseServerClient
    .from("stripe_connected_customers")
    .upsert(
      {
        identity_id: identity.id,
        stripe_account_id: stripeAccount,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "identity_id,stripe_account_id" },
    );
  if (error) console.error("[wallet] connected customer upsert failed:", error);
  return customer.id;
}

// Pull the saved card and owning customer out of a completed setup-mode Checkout
// session. Caller must verify the customer matches the reader's wallet before
// trusting it (the session id arrives from a client-controlled return URL).
export async function walletCheckoutSessionCard(
  sessionId: string,
): Promise<{ pmId: string; customerId: string } | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent"],
  });
  const si = session.setup_intent;
  const pmId =
    typeof si === "object" && si
      ? typeof si.payment_method === "string"
        ? si.payment_method
        : (si.payment_method?.id ?? null)
      : null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);
  if (!pmId || !customerId) return null;
  return { pmId, customerId };
}

// Clone the wallet card onto the connected account and attach it to the reader's
// connected-account customer, returning the connected-account PM id ready to be a
// subscription's default_payment_method.
export async function provisionCardOnAccount(args: {
  walletPmId: string;
  platformCustomerId: string;
  connectedCustomerId: string;
  stripeAccount: string;
}): Promise<string> {
  const clonedPmId = await cloneCardToAccount(
    args.walletPmId,
    args.platformCustomerId,
    args.stripeAccount,
  );
  await getStripe().paymentMethods.attach(
    clonedPmId,
    { customer: args.connectedCustomerId },
    { stripeAccount: args.stripeAccount },
  );
  return clonedPmId;
}
