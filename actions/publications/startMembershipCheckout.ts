"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { PLATFORM_FEE_BPS } from "stripe/connect";
import { isActiveMembership } from "src/membership";
import { getReaderMembership } from "src/membership.server";
import { Ok, Err, type Result } from "src/result";

type CheckoutError =
  | "not_authenticated"
  | "memberships_not_enabled"
  | "tier_not_found"
  | "no_connected_account"
  | "already_member"
  | "own_publication"
  | "stripe_error";

export async function startMembershipCheckout(args: {
  publicationUri: string;
  tierId: string;
  cadence: "month" | "year";
  returnUrl?: string;
}): Promise<Result<{ url: string }, CheckoutError>> {
  const identity = await getIdentityData();
  if (!identity) return Err("not_authenticated");

  const [{ data: publication }, { data: tier }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select("uri, identity_did, record, publication_membership_settings(enabled)")
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

  // Destination charge: the publisher's connected account receives the funds.
  const { data: owner } = await supabaseServerClient
    .from("identities")
    .select(
      "id, stripe_connected_accounts(stripe_account_id, charges_enabled)",
    )
    .eq("atp_did", publication.identity_did)
    .maybeSingle();
  const connectedAccount = owner?.stripe_connected_accounts;
  if (!connectedAccount?.charges_enabled) return Err("no_connected_account");

  const existing = await getReaderMembership(args.publicationUri, identity.id);
  if (isActiveMembership(existing ?? null)) return Err("already_member");

  // Reuse the reader's platform customer from Leaflet Pro or any prior
  // membership so they don't accumulate duplicate Stripe customers.
  let customerId = existing?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const [{ data: proSub }, { data: otherMembership }] = await Promise.all([
      supabaseServerClient
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("identity_id", identity.id)
        .maybeSingle(),
      supabaseServerClient
        .from("publication_memberships")
        .select("stripe_customer_id")
        .eq("identity_id", identity.id)
        .not("stripe_customer_id", "is", null)
        .limit(1)
        .maybeSingle(),
    ]);
    customerId =
      proSub?.stripe_customer_id ??
      otherMembership?.stripe_customer_id ??
      undefined;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";
  const publicationUrl = getPublicationURL(publication);
  // getPublicationURL returns a custom-domain absolute URL or a relative
  // /lish path; Stripe requires absolute URLs.
  const absolutePubUrl = new URL(publicationUrl, appUrl).toString();
  const successUrl = args.returnUrl
    ? new URL(args.returnUrl, appUrl).toString()
    : absolutePubUrl;
  const cancelUrl = new URL(
    `${publicationUrl.replace(/\/$/, "")}/join`,
    appUrl,
  ).toString();

  const metadata = {
    kind: "publication_membership",
    publication: args.publicationUri,
    tier_id: tier.id,
    identity_id: identity.id,
  };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: identity.id,
      ...(customerId
        ? { customer: customerId }
        : { customer_email: identity.email || undefined }),
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_BPS / 100,
        transfer_data: { destination: connectedAccount.stripe_account_id },
        metadata,
      },
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (!session.url) return Err("stripe_error");
    return Ok({ url: session.url });
  } catch (e) {
    console.error("[startMembershipCheckout] session create failed:", e);
    return Err("stripe_error");
  }
}
