"use server";

import { getAuthIdentity } from "src/auth";
import { getStripe } from "stripe/client";
import { releaseSchedule } from "stripe/schedules";
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
    const stripe = getStripe();
    const opts = { stripeAccount: m.stripe_account_id };
    // Stripe refuses cancellation changes on a subscription a schedule (a
    // pending downgrade) manages; either toggle supersedes that downgrade.
    const sub = await stripe.subscriptions.retrieve(
      m.stripe_subscription_id,
      opts,
    );
    await releaseSchedule(sub, opts);
    await stripe.subscriptions.update(
      m.stripe_subscription_id,
      { cancel_at_period_end: cancel },
      opts,
    );
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        cancel_at_period_end: cancel,
        pending_tier: null,
        pending_cadence: null,
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
    // Repricing across intervals has to reset the billing cycle so the new
    // interval starts now instead of stacking on the old period's end.
    intervalChanged: item.price.recurring?.interval !== args.cadence,
  });
}

type ChangeTarget = Extract<
  Awaited<ReturnType<typeof resolveChangeTarget>>,
  { ok: true }
>["value"];

export type MembershipChangePreview = {
  // Charged now, prorated, vs. applied when the current period ends.
  immediate: boolean;
  // Prorated difference before any account credit; 0 means a same-price switch.
  totalCents: number;
  amountDueCents: number;
  currency: string;
  effectiveDate: string | null;
};

// Whether the switch would refund anything decides how it's applied: a plan
// that costs the same or more is charged now, prorated for the rest of the
// period; one that costs less waits for the period to end — like cancelling
// does — instead of leaving a credit to burn down on future invoices.
async function previewChange(
  t: ChangeTarget,
): Promise<MembershipChangePreview> {
  const preview = await getStripe().invoices.createPreview(
    {
      subscription: t.subscriptionId,
      subscription_details: {
        items: [{ id: t.itemId, price: t.priceId }],
        proration_behavior: "always_invoice",
        billing_cycle_anchor: t.intervalChanged ? "now" : "unchanged",
      },
    },
    { stripeAccount: t.stripeAccount },
  );
  const immediate = preview.total >= 0;
  return {
    immediate,
    totalCents: preview.total,
    amountDueCents: immediate ? preview.amount_due : 0,
    currency: preview.currency,
    effectiveDate: t.currentPeriodEnd
      ? new Date(t.currentPeriodEnd * 1000).toISOString()
      : null,
  };
}

export async function previewMembershipChange(
  args: ChangeArgs,
): Promise<Result<MembershipChangePreview, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  try {
    const resolved = await resolveChangeTarget(identity.id, args);
    if (!resolved.ok) return resolved;
    return Ok(await previewChange(resolved.value));
  } catch (e) {
    console.error("[memberships] change preview failed:", e);
    return Err("stripe_error");
  }
}

export type MembershipChangeResult = Pick<
  MembershipChangePreview,
  "immediate" | "effectiveDate"
>;

export async function changeMembership(
  args: ChangeArgs,
): Promise<Result<MembershipChangeResult, MembershipError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");

  try {
    const resolved = await resolveChangeTarget(identity.id, args);
    if (!resolved.ok) return resolved;
    const t = resolved.value;
    const stripe = getStripe();
    const opts = { stripeAccount: t.stripeAccount };
    const preview = await previewChange(t);
    const metadata = {
      ...t.sub.metadata,
      tier_id: t.tier.id,
      cadence: args.cadence,
    };

    // Any previously scheduled downgrade is superseded by this change.
    await releaseSchedule(t.sub, opts);

    if (preview.immediate) {
      await stripe.subscriptions.update(
        t.subscriptionId,
        {
          items: [{ id: t.itemId, price: t.priceId }],
          proration_behavior: "always_invoice",
          billing_cycle_anchor: t.intervalChanged ? "now" : "unchanged",
          metadata,
        },
        opts,
      );
      await supabaseServerClient
        .from("publication_memberships")
        .update({
          tier: t.tier.id,
          cadence: args.cadence,
          stripe_price_id: t.priceId,
          pending_tier: null,
          pending_cadence: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.membershipId);
    } else {
      const schedule = await stripe.subscriptionSchedules.create(
        { from_subscription: t.subscriptionId },
        opts,
      );
      const current = schedule.phases[0];
      // A phase transition writes the phase's metadata onto the subscription,
      // and from_subscription doesn't carry the existing metadata over, so
      // both phases spell it out.
      await stripe.subscriptionSchedules.update(
        schedule.id,
        {
          end_behavior: "release",
          phases: [
            {
              start_date: current.start_date,
              end_date: current.end_date,
              items: current.items.map((i) => ({
                price: typeof i.price === "string" ? i.price : i.price.id,
                quantity: i.quantity,
              })),
              metadata: t.sub.metadata,
            },
            {
              items: [{ price: t.priceId, quantity: 1 }],
              duration: { interval: args.cadence, interval_count: 1 },
              proration_behavior: "none",
              metadata,
            },
          ],
        },
        opts,
      );
      await supabaseServerClient
        .from("publication_memberships")
        .update({
          pending_tier: t.tier.id,
          pending_cadence: args.cadence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.membershipId);
    }
    return Ok({
      immediate: preview.immediate,
      effectiveDate: preview.effectiveDate,
    });
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

export type MyMembership = {
  id: string;
  publication: string;
  publicationName: string | null;
  publicationUrl: string;
  tierId: string;
  tierName: string | null;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  cadence: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  // A scheduled downgrade that takes effect at currentPeriodEnd.
  pendingPlan: {
    tierName: string | null;
    cadence: string | null;
    priceCents: number | null;
  } | null;
};

const MY_MEMBERSHIP_SELECT = `id, publication, tier, cadence, status, current_period_end, cancel_at_period_end, pending_cadence,
  publications(uri, name, record),
  publication_membership_tiers!publication_memberships_tier_publication_fkey(id, name, monthly_price_cents, annual_price_cents),
  pending_tier_row:publication_membership_tiers!publication_memberships_pending_tier_fkey(id, name, monthly_price_cents, annual_price_cents)`;

const myMembershipQuery = () =>
  supabaseServerClient
    .from("publication_memberships")
    .select(MY_MEMBERSHIP_SELECT);

type MyMembershipRow = NonNullable<
  Awaited<ReturnType<typeof myMembershipQuery>>["data"]
>[number];

function toMyMembership(row: MyMembershipRow): MyMembership {
  const pub = row.publications;
  const tier = row.publication_membership_tiers;
  const pending = row.pending_tier_row;
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
    pendingPlan: pending
      ? {
          tierName: pending.name,
          cadence: row.pending_cadence,
          priceCents:
            row.pending_cadence === "year"
              ? pending.annual_price_cents
              : pending.monthly_price_cents,
        }
      : null,
  };
}

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

  const { data: row } = await myMembershipQuery()
    .eq("identity_id", identity.id)
    .eq("publication", publicationUri)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return row ? toMyMembership(row) : null;
}

export async function getMyMemberships(): Promise<MyMembershipsData | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const [{ data: rows }, { data: wallet }] = await Promise.all([
    myMembershipQuery()
      .eq("identity_id", identity.id)
      .order("created_at", { ascending: false }),
    supabaseServerClient
      .from("stripe_wallets")
      .select("card_brand, card_last4, card_exp_month, card_exp_year")
      .eq("identity_id", identity.id)
      .maybeSingle(),
  ]);

  return {
    memberships: (rows ?? []).map(toMyMembership),
    wallet: wallet ?? null,
  };
}
