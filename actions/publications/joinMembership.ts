"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PLATFORM_FEE_BPS } from "stripe/connect";
import {
  getOrCreateWallet,
  saveWalletCard,
  getOrCreateConnectedCustomer,
  provisionCardOnAccount,
  walletCheckoutSessionCard,
} from "stripe/wallet";
import { isActiveMembership } from "src/membership";
import {
  getReaderMembership,
  notifyNewMember,
} from "src/membership.server";
import { Ok, Err, type Result } from "src/result";

type CheckoutSessionError = "not_authenticated" | "stripe_error";

// First-time card collection is a Stripe-hosted setup-mode Checkout page (no
// Stripe.js on our side). The card is saved off-session on the platform wallet
// customer so it can be cloned to publishers' accounts and charged for renewals.
// The reader returns to `returnUrl` with `?wallet_session=<id>`.
export async function createWalletCheckoutSession(args: {
  returnUrl: string;
  // When set, the return URL carries the intended tier/cadence so the reader's
  // join auto-completes on return instead of making them click Join again.
  tierId?: string;
  cadence?: "month" | "year";
}): Promise<Result<{ url: string }, CheckoutSessionError>> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");
  try {
    const wallet = await getOrCreateWallet(identity);
    const base = args.returnUrl.split("?")[0];
    const joinParams =
      args.tierId && args.cadence
        ? `&join_tier=${encodeURIComponent(args.tierId)}&join_cadence=${args.cadence}`
        : "";
    const session = await getStripe().checkout.sessions.create({
      mode: "setup",
      customer: wallet.stripe_customer_id,
      payment_method_types: ["card"],
      success_url: `${base}?wallet_session={CHECKOUT_SESSION_ID}${joinParams}`,
      cancel_url: base,
    });
    if (!session.url) return Err("stripe_error");
    return Ok({ url: session.url });
  } catch (e) {
    console.error("[joinMembership] checkout session failed:", e);
    return Err("stripe_error");
  }
}

// Called on return from the hosted setup page: attach the collected card to the
// wallet and make it the default. Verifies the session's customer is the caller's
// own wallet customer (the session id comes from a client-controlled URL).
export async function saveWalletCardFromSession(
  sessionId: string,
): Promise<Result<null, CheckoutSessionError>> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");
  try {
    const [wallet, card] = await Promise.all([
      getOrCreateWallet(identity),
      walletCheckoutSessionCard(sessionId),
    ]);
    if (!card || card.customerId !== wallet.stripe_customer_id)
      return Err("stripe_error");
    await saveWalletCard(identity.id, card.pmId);
    return Ok(null);
  } catch (e) {
    console.error("[joinMembership] save card from session failed:", e);
    return Err("stripe_error");
  }
}

type SubscribeError =
  | "not_authenticated"
  | "email_required"
  | "memberships_not_enabled"
  | "tier_not_found"
  | "no_connected_account"
  | "already_member"
  | "own_publication"
  | "no_card"
  | "stripe_error";

export type SubscribeToTierResult = {
  // "active" when the saved card charged off-session (the common case).
  // "requires_action" when the bank demanded authentication or the charge was
  // declined — the reader is sent to hostedInvoiceUrl (a Stripe-hosted page) to
  // authenticate or fix the payment; the connect-events webhook then activates.
  status: string;
  hostedInvoiceUrl: string | null;
};

export async function subscribeToTier(args: {
  publicationUri: string;
  tierId: string;
  cadence: "month" | "year";
}): Promise<Result<SubscribeToTierResult, SubscribeError>> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");
  if (!identity.email) return Err("email_required");

  const [{ data: publication }, { data: tier }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select("uri, identity_did, publication_membership_settings(enabled)")
      .eq("uri", args.publicationUri)
      .maybeSingle(),
    supabaseServerClient
      .from("publication_membership_tiers")
      .select("*")
      .eq("id", args.tierId)
      .eq("publication", args.publicationUri)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!publication?.publication_membership_settings?.enabled)
    return Err("memberships_not_enabled");
  if (identity.atp_did && identity.atp_did === publication.identity_did)
    return Err("own_publication");
  if (!tier) return Err("tier_not_found");

  const priceId =
    args.cadence === "year"
      ? tier.stripe_price_annual_id
      : tier.stripe_price_monthly_id;
  if (!priceId) return Err("tier_not_found");

  // The subscription is a direct charge on the publisher's connected account.
  const { data: owner } = await supabaseServerClient
    .from("identities")
    .select("stripe_connected_accounts(stripe_account_id, charges_enabled)")
    .eq("atp_did", publication.identity_did)
    .maybeSingle();
  const connectedAccount = owner?.stripe_connected_accounts;
  if (!connectedAccount?.charges_enabled) return Err("no_connected_account");
  const stripeAccount = connectedAccount.stripe_account_id;

  const existing = await getReaderMembership(args.publicationUri, identity.id);
  if (isActiveMembership(existing ?? null)) return Err("already_member");

  const stripe = getStripe();
  try {
    const wallet = await getOrCreateWallet(identity);
    const walletPmId = wallet.default_payment_method_id;
    if (!walletPmId) return Err("no_card");

    // Retire any lingering non-active subscription for this reader+publication
    // (e.g. an abandoned authentication step) before creating a fresh one.
    if (
      existing?.stripe_subscription_id &&
      existing.stripe_account_id &&
      !isActiveMembership(existing)
    ) {
      // The row can look lapsed just because a renewal webhook was missed;
      // only Stripe knows whether the subscription is still billing, and
      // canceling a live one here would kill a paid-up membership with no
      // refund.
      const liveSub = await stripe.subscriptions
        .retrieve(existing.stripe_subscription_id, {
          stripeAccount: existing.stripe_account_id,
        })
        .catch((e) => {
          if ((e as { code?: string })?.code === "resource_missing")
            return null;
          throw e;
        });
      if (
        liveSub &&
        (liveSub.status === "active" || liveSub.status === "trialing")
      ) {
        const livePeriodEnd = liveSub.items.data[0]?.current_period_end ?? 0;
        const { error } = await supabaseServerClient
          .from("publication_memberships")
          .update({
            status: liveSub.status,
            current_period_end: livePeriodEnd
              ? new Date(livePeriodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: liveSub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error)
          console.error(
            "[joinMembership] membership refresh from stripe failed:",
            error,
          );
        return Err("already_member");
      }
      if (liveSub) {
        await stripe.subscriptions
          .cancel(existing.stripe_subscription_id, undefined, {
            stripeAccount: existing.stripe_account_id,
          })
          .catch(() => {});
      }
    }

    const connectedCustomerId = await getOrCreateConnectedCustomer(
      identity,
      stripeAccount,
    );
    const clonedPmId = await provisionCardOnAccount({
      walletPmId,
      platformCustomerId: wallet.stripe_customer_id,
      connectedCustomerId,
      stripeAccount,
    });

    // Default payment behavior finalizes and charges the first invoice inline.
    // With a saved off-session card the charge is merchant-initiated: it either
    // succeeds (status active) or leaves the subscription incomplete with an open
    // invoice the reader can complete on Stripe's hosted invoice page.
    const subscription = await stripe.subscriptions.create(
      {
        customer: connectedCustomerId,
        items: [{ price: priceId }],
        application_fee_percent: PLATFORM_FEE_BPS / 100,
        default_payment_method: clonedPmId,
        payment_settings: { save_default_payment_method: "off" },
        metadata: {
          kind: "publication_membership",
          publication: args.publicationUri,
          tier_id: tier.id,
          identity_id: identity.id,
          cadence: args.cadence,
        },
        expand: ["latest_invoice"],
      },
      {
        stripeAccount,
        // Dedups double-submits of the same attempt. Includes the prior
        // subscription id so a retry after an abandoned attempt (which cancels
        // that prior sub above) produces a genuinely new subscription rather than
        // Stripe replaying the stale, now-canceled one.
        idempotencyKey: `membership-sub-${identity.id}-${args.publicationUri}-${args.tierId}-${args.cadence}-${existing?.stripe_subscription_id ?? "new"}`,
      },
    );

    const item = subscription.items.data[0];
    const periodEnd = item?.current_period_end ?? 0;
    const invoice =
      typeof subscription.latest_invoice === "object"
        ? subscription.latest_invoice
        : null;

    const { data: membershipRow, error } = await supabaseServerClient
      .from("publication_memberships")
      .upsert(
        {
          publication: args.publicationUri,
          identity_id: identity.id,
          tier: tier.id,
          cadence: args.cadence,
          stripe_account_id: stripeAccount,
          stripe_customer_id: connectedCustomerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "publication,identity_id" },
      )
      .select("id")
      .single();
    if (error || !membershipRow) {
      console.error("[joinMembership] membership upsert failed:", error);
      return Err("stripe_error");
    }

    // The webhook only notifies on an inactive→active transition, and this
    // row is already active by the time its events arrive — so the inline
    // join is what notifies the publisher (notifyNewMember dedupes against
    // the webhook's reconciliation path). A notification failure shouldn't
    // fail a join that already billed.
    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      try {
        await notifyNewMember(args.publicationUri, membershipRow.id);
      } catch (e) {
        console.error("[joinMembership] new member notification failed:", e);
      }
    }

    // Concurrent joins (different tier/cadence, so different idempotency keys)
    // can each create a live subscription while only one row survives the
    // upsert. Cancel any older live subscription for this reader+publication so
    // exactly one keeps billing; ties break by id so racing requests can't
    // cancel each other. The connect-events webhook reconciles the row if the
    // survivor isn't the one it points at.
    try {
      const siblings = await stripe.subscriptions.list(
        { customer: connectedCustomerId, status: "all", limit: 100 },
        { stripeAccount },
      );
      for (const other of siblings.data) {
        if (other.id === subscription.id) continue;
        if (other.metadata?.kind !== "publication_membership") continue;
        if (other.metadata?.publication !== args.publicationUri) continue;
        if (other.status === "canceled" || other.status === "incomplete_expired")
          continue;
        if (
          other.created > subscription.created ||
          (other.created === subscription.created &&
            other.id > subscription.id)
        )
          continue;
        await stripe.subscriptions
          .cancel(other.id, undefined, { stripeAccount })
          .catch((e) =>
            console.error(
              `[joinMembership] failed to cancel duplicate subscription ${other.id}:`,
              e,
            ),
          );
      }
    } catch (e) {
      console.error("[joinMembership] duplicate subscription sweep failed:", e);
    }

    if (subscription.status === "active" || subscription.status === "trialing")
      return Ok({ status: "active", hostedInvoiceUrl: null });

    return Ok({
      status: "requires_action",
      hostedInvoiceUrl: invoice?.hosted_invoice_url ?? null,
    });
  } catch (e) {
    console.error("[joinMembership] subscribe failed:", e);
    return Err("stripe_error");
  }
}
