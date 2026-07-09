"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getOrCreateWallet,
  saveWalletCard,
  getOrCreateConnectedCustomer,
  provisionCardOnAccount,
  walletCheckoutSessionCard,
  type WalletRow,
} from "stripe/wallet";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
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
  const identity = await getIdentityData();
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

// Switch tier and/or monthly↔annual on the single subscription item, letting
// Stripe apply its default proration.
export async function switchMembership(args: {
  membershipId: string;
  tierId: string;
  cadence: "month" | "year";
}): Promise<Result<null, MembershipError>> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");
  const m = await loadOwnedMembership(identity.id, args.membershipId);
  if (!m?.stripe_subscription_id || !m.stripe_account_id)
    return Err("not_found");

  const { data: tier } = await supabaseServerClient
    .from("publication_membership_tiers")
    .select("*")
    .eq("id", args.tierId)
    .eq("publication", m.publication)
    .eq("active", true)
    .maybeSingle();
  if (!tier) return Err("tier_not_found");
  const priceId =
    args.cadence === "year"
      ? tier.stripe_price_annual_id
      : tier.stripe_price_monthly_id;
  if (!priceId) return Err("tier_not_found");

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(m.stripe_subscription_id, {
      stripeAccount: m.stripe_account_id,
    });
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return Err("stripe_error");
    await stripe.subscriptions.update(
      m.stripe_subscription_id,
      { items: [{ id: itemId, price: priceId }] },
      { stripeAccount: m.stripe_account_id },
    );
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        tier: tier.id,
        cadence: args.cadence,
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.membershipId);
    return Ok(null);
  } catch (e) {
    console.error("[memberships] switch failed:", e);
    return Err("stripe_error");
  }
}

// Save a card collected via the hosted setup Checkout to the wallet, then
// re-clone it onto every membership's connected account and swap it in as the
// subscription's payment method. Best-effort per membership: a failure on one
// doesn't block the others.
export async function updateWalletCard(sessionId: string): Promise<
  Result<{ failedPublications: string[] }, MembershipError>
> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");
  const stripe = getStripe();
  try {
    const [wallet, card] = await Promise.all([
      getOrCreateWallet(identity),
      walletCheckoutSessionCard(sessionId),
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
        console.error(
          "[memberships] card swap failed for",
          m.publication,
          e,
        );
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
  const identity = await getIdentityData();
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
  const identity = await getIdentityData();
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

  const publicationUris = Array.from(new Set((rows ?? []).map((r) => r.publication)));
  const { data: allTiers } = publicationUris.length
    ? await supabaseServerClient
        .from("publication_membership_tiers")
        .select("id, publication, name, monthly_price_cents, annual_price_cents, sort_order")
        .in("publication", publicationUris)
        .eq("active", true)
    : { data: [] };
  const tiersByPublication = new Map<string, AvailableTier[]>();
  for (const t of (allTiers ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
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
