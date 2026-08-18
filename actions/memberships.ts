"use server";

import { getAuthIdentity } from "src/auth";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getOrCreateWallet,
  saveWalletCard,
  getOrCreateConnectedCustomer,
  provisionCardOnAccount,
  walletCheckoutSessionCard,
  walletSetupIntentCard,
  type WalletRow,
} from "stripe/wallet";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { subscribeToPublication } from "actions/publications/subscribeToPublication";
import { requestPublicationEmailSubscription } from "actions/publications/subscribeEmail";
import { Ok, Err, type Result } from "src/result";

type MembershipError =
  | "not_authenticated"
  | "not_found"
  | "tier_not_found"
  | "stripe_error";

async function loadOwnedMembership(identityId: string, membershipId: string) {
  const { data } = await supabaseServerClient
    .from("publication_memberships")
    .select("*")
    .eq("id", membershipId)
    .eq("identity_id", identityId)
    .maybeSingle();
  return data;
}

async function setCancelAtPeriodEnd(
  membershipId: string,
  cancel: boolean,
): Promise<Result<null, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  const m = await loadOwnedMembership(identity.id, membershipId);
  if (!m?.stripe_subscription_id || !m.stripe_account_id)
    return Err("not_found");
  try {
    await getStripe().subscriptions.update(
      m.stripe_subscription_id,
      { cancel_at_period_end: cancel },
      { stripeAccount: m.stripe_account_id },
    );
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        cancel_at_period_end: cancel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId);
    return Ok(null);
  } catch (e) {
    console.error("[memberships] cancel toggle failed:", e);
    return Err("stripe_error");
  }
}

export async function cancelMembership(
  membershipId: string,
): Promise<Result<null, MembershipError>> {
  return setCancelAtPeriodEnd(membershipId, true);
}

export async function resumeMembership(
  membershipId: string,
): Promise<Result<null, MembershipError>> {
  return setCancelAtPeriodEnd(membershipId, false);
}

async function publicationHasNewsletter(publicationUri: string) {
  const { data } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .select("enabled")
    .eq("publication", publicationUri)
    .maybeSingle();
  return !!data?.enabled;
}

export async function changeMembershipToFree(args: {
  membershipId: string;
  publicationUri: string;

  newsletterMode?: boolean;
}): Promise<Result<{ subscribed: boolean }, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");

  const cancelled = await setCancelAtPeriodEnd(args.membershipId, true);
  if (!cancelled.ok) return cancelled;

  const newsletterMode =
    args.newsletterMode ??
    (await publicationHasNewsletter(args.publicationUri));

  try {
    if (newsletterMode && identity.email) {
      const res = await requestPublicationEmailSubscription(
        args.publicationUri,
        identity.email,
      );
      return Ok({ subscribed: res.ok });
    }
    if (identity.atp_did) {
      const res = await subscribeToPublication(args.publicationUri);
      return Ok({ subscribed: res.success });
    }
    return Ok({ subscribed: false });
  } catch (e) {
    console.error("[memberships] free subscription after downgrade failed:", e);
    return Ok({ subscribed: false });
  }
}

type ChangeArgs = {
  membershipId: string;
  tierId: string;
  cadence: "month" | "year";
};

async function resolveChangeTarget(identityId: string, args: ChangeArgs) {
  const m = await loadOwnedMembership(identityId, args.membershipId);
  if (!m?.stripe_subscription_id || !m.stripe_account_id)
    return Err("not_found" as const);

  const { data: tier } = await supabaseServerClient
    .from("publication_membership_tiers")
    .select("*")
    .eq("id", args.tierId)
    .eq("publication", m.publication)
    .eq("active", true)
    .maybeSingle();
  if (!tier) return Err("tier_not_found" as const);
  const priceId =
    args.cadence === "year"
      ? tier.stripe_price_annual_id
      : tier.stripe_price_monthly_id;
  if (!priceId) return Err("tier_not_found" as const);

  const sub = await getStripe().subscriptions.retrieve(
    m.stripe_subscription_id,
    { stripeAccount: m.stripe_account_id },
  );
  const item = sub.items.data[0];
  if (!item) return Err("stripe_error" as const);

  return Ok({
    stripeAccount: m.stripe_account_id,
    subscriptionId: m.stripe_subscription_id,
    tier,
    priceId,
    sub,
    itemId: item.id,
    currentPeriodEnd: item.current_period_end ?? null,
    // Repricing across intervals resets the billing cycle, which makes Stripe
    // invoice on the spot instead of deferring the prorations.
    intervalChanged: item.price.recurring?.interval !== args.cadence,
  });
}

export type MembershipChangePreview = {
  immediate: boolean;
  amountDueCents: number;
  currency: string;
  nextInvoiceDate: string | null;
  creditCents: number;
};

export async function previewMembershipChange(
  args: ChangeArgs,
): Promise<Result<MembershipChangePreview, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  try {
    const resolved = await resolveChangeTarget(identity.id, args);
    if (!resolved.ok) return resolved;
    const t = resolved.value;

    const preview = await getStripe().invoices.createPreview(
      {
        subscription: t.subscriptionId,
        subscription_details: {
          items: [{ id: t.itemId, price: t.priceId }],
          proration_behavior: "create_prorations",
          billing_cycle_anchor: t.intervalChanged ? "now" : "unchanged",
        },
      },
      { stripeAccount: t.stripeAccount },
    );
    return Ok({
      immediate: t.intervalChanged,
      amountDueCents: preview.amount_due,
      currency: preview.currency,
      nextInvoiceDate:
        !t.intervalChanged && t.currentPeriodEnd
          ? new Date(t.currentPeriodEnd * 1000).toISOString()
          : null,
      creditCents: preview.total < 0 ? -preview.total : 0,
    });
  } catch (e) {
    console.error("[memberships] change preview failed:", e);
    return Err("stripe_error");
  }
}

export async function changeMembership(
  args: ChangeArgs,
): Promise<Result<null, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");

  try {
    const resolved = await resolveChangeTarget(identity.id, args);
    if (!resolved.ok) return resolved;
    const t = resolved.value;

    await getStripe().subscriptions.update(
      t.subscriptionId,
      {
        items: [{ id: t.itemId, price: t.priceId }],
        proration_behavior: "create_prorations",
        billing_cycle_anchor: t.intervalChanged ? "now" : "unchanged",
        metadata: {
          ...t.sub.metadata,
          tier_id: t.tier.id,
          cadence: args.cadence,
        },
      },
      { stripeAccount: t.stripeAccount },
    );
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        tier: t.tier.id,
        cadence: args.cadence,
        stripe_price_id: t.priceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.membershipId);
    return Ok(null);
  } catch (e) {
    console.error("[memberships] change failed:", e);
    return Err("stripe_error");
  }
}

export async function updateWalletCard(
  sessionId: string,
): Promise<Result<{ failedPublications: string[] }, MembershipError>> {
  return applyNewWalletCard(() => walletCheckoutSessionCard(sessionId));
}

export async function updateWalletCardFromSetupIntent(
  setupIntentId: string,
): Promise<Result<{ failedPublications: string[] }, MembershipError>> {
  return applyNewWalletCard(() => walletSetupIntentCard(setupIntentId));
}

// Save a newly collected card as the wallet default, then re-clone it onto
// every membership's connected account so renewals bill the new card.
async function applyNewWalletCard(
  getCard: () => Promise<{ pmId: string; customerId: string } | null>,
): Promise<Result<{ failedPublications: string[] }, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  const stripe = getStripe();
  try {
    const [wallet, card] = await Promise.all([
      getOrCreateWallet(identity),
      getCard(),
    ]);
    if (!card || card.customerId !== wallet.stripe_customer_id)
      return Err("not_found");
    const saved = await saveWalletCard(identity.id, card.pmId);

    const { data: memberships } = await supabaseServerClient
      .from("publication_memberships")
      .select("*")
      .eq("identity_id", identity.id)
      .not("stripe_subscription_id", "is", null)
      .not("stripe_account_id", "is", null);

    const failedPublications: string[] = [];
    for (const m of memberships ?? []) {
      if (!m.stripe_subscription_id || !m.stripe_account_id) continue;
      try {
        const connectedCustomerId = await getOrCreateConnectedCustomer(
          identity,
          m.stripe_account_id,
        );
        const clonedPmId = await provisionCardOnAccount({
          walletPmId: saved.default_payment_method_id!,
          platformCustomerId: wallet.stripe_customer_id,
          connectedCustomerId,
          stripeAccount: m.stripe_account_id,
        });
        await stripe.subscriptions.update(
          m.stripe_subscription_id,
          { default_payment_method: clonedPmId },
          { stripeAccount: m.stripe_account_id },
        );
      } catch (e) {
        console.error("[memberships] card swap failed for", m.publication, e);
        failedPublications.push(m.publication);
      }
    }
    return Ok({ failedPublications });
  } catch (e) {
    console.error("[memberships] updateWalletCard failed:", e);
    return Err("stripe_error");
  }
}

export type AvailableTier = {
  id: string;
  name: string;
  monthly_price_cents: number;
  annual_price_cents: number | null;
};

export type MyMembership = {
  id: string;
  publication: string;
  publicationName: string | null;
  publicationUrl: string;
  tierId: string | null;
  tierName: string | null;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  cadence: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  availableTiers: AvailableTier[];
};

export type MyMembershipsData = {
  memberships: MyMembership[];
  wallet: Pick<
    WalletRow,
    "card_brand" | "card_last4" | "card_exp_month" | "card_exp_year"
  > | null;
};

export async function getMyMembershipForPublication(
  publicationUri: string,
): Promise<MyMembership | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const [{ data: row }, { data: tiers }] = await Promise.all([
    supabaseServerClient
      .from("publication_memberships")
      .select(
        `id, publication, tier, cadence, status, current_period_end, cancel_at_period_end,
         publications(uri, name, record),
         publication_membership_tiers(id, name, monthly_price_cents, annual_price_cents)`,
      )
      .eq("identity_id", identity.id)
      .eq("publication", publicationUri)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseServerClient
      .from("publication_membership_tiers")
      .select("id, name, monthly_price_cents, annual_price_cents, sort_order")
      .eq("publication", publicationUri)
      .eq("active", true)
      .eq("is_free", false)
      .order("sort_order", { ascending: true }),
  ]);
  if (!row) return null;

  const pub = row.publications;
  const tier = row.publication_membership_tiers;
  return {
    id: row.id,
    publication: row.publication,
    publicationName: pub?.name ?? null,
    publicationUrl: pub ? getPublicationURL(pub) : "",
    tierId: row.tier,
    tierName: tier?.name ?? null,
    monthlyPriceCents: tier?.monthly_price_cents ?? null,
    annualPriceCents: tier?.annual_price_cents ?? null,
    cadence: row.cadence,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    availableTiers: (tiers ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      monthly_price_cents: t.monthly_price_cents,
      annual_price_cents: t.annual_price_cents,
    })),
  };
}

export async function getMyMemberships(): Promise<MyMembershipsData | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const [{ data: rows }, { data: wallet }] = await Promise.all([
    supabaseServerClient
      .from("publication_memberships")
      .select(
        `id, publication, tier, cadence, status, current_period_end, cancel_at_period_end,
         publications(uri, name, record),
         publication_membership_tiers(id, name, monthly_price_cents, annual_price_cents)`,
      )
      .eq("identity_id", identity.id)
      .order("created_at", { ascending: false }),
    supabaseServerClient
      .from("stripe_wallets")
      .select("card_brand, card_last4, card_exp_month, card_exp_year")
      .eq("identity_id", identity.id)
      .maybeSingle(),
  ]);

  const publicationUris = Array.from(
    new Set((rows ?? []).map((r) => r.publication)),
  );
  const { data: allTiers } = publicationUris.length
    ? await supabaseServerClient
        .from("publication_membership_tiers")
        .select(
          "id, publication, name, monthly_price_cents, annual_price_cents, sort_order",
        )
        .in("publication", publicationUris)
        .eq("active", true)
        .eq("is_free", false)
    : { data: [] };
  const tiersByPublication = new Map<string, AvailableTier[]>();
  for (const t of (allTiers ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  )) {
    const list = tiersByPublication.get(t.publication) ?? [];
    list.push({
      id: t.id,
      name: t.name,
      monthly_price_cents: t.monthly_price_cents,
      annual_price_cents: t.annual_price_cents,
    });
    tiersByPublication.set(t.publication, list);
  }

  const memberships: MyMembership[] = (rows ?? []).map((r) => {
    const pub = r.publications;
    const tier = r.publication_membership_tiers;
    return {
      id: r.id,
      publication: r.publication,
      publicationName: pub?.name ?? null,
      publicationUrl: pub ? getPublicationURL(pub) : "",
      tierId: r.tier,
      tierName: tier?.name ?? null,
      monthlyPriceCents: tier?.monthly_price_cents ?? null,
      annualPriceCents: tier?.annual_price_cents ?? null,
      cadence: r.cadence,
      status: r.status,
      currentPeriodEnd: r.current_period_end,
      cancelAtPeriodEnd: r.cancel_at_period_end,
      availableTiers: tiersByPublication.get(r.publication) ?? [],
    };
  });

  return { memberships, wallet: wallet ?? null };
}
