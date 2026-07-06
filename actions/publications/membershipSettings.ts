"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { getStripe } from "stripe/client";
import { Ok, Err, type Result } from "src/result";

type ToggleError =
  | "unauthorized"
  | "no_connected_account"
  | "unsupported"
  | "database_error";
type TierError =
  | "unauthorized"
  | "invalid_tier"
  | "tier_not_found"
  | "no_connected_account"
  | "database_error"
  | "stripe_error";

async function assertPublicationOwner(publicationUri: string) {
  const [identity, { data: publication }] = await Promise.all([
    getIdentityData(),
    supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("uri", publicationUri)
      .single(),
  ]);
  if (!identity || !identity.atp_did) return null;
  if (!publication || publication.identity_did !== identity.atp_did)
    return null;
  return identity;
}

export async function enableMemberships(
  publicationUri: string,
): Promise<Result<null, ToggleError>> {
  const identity = await assertPublicationOwner(publicationUri);
  if (!identity) return Err("unauthorized");
  // Memberships are paid out to the publisher's connected account, so there's
  // nothing to enable until Stripe can actually charge on their behalf.
  if (!identity.connectedAccount?.charges_enabled)
    return Err("no_connected_account");

  const { error } = await supabaseServerClient
    .from("publication_membership_settings")
    .upsert(
      {
        publication: publicationUri,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "publication" },
    );
  if (error) {
    console.error("[membershipSettings] enable upsert failed:", error);
    return Err("database_error");
  }
  return Ok(null);
}

// Disabling is not supported: active members hold direct-charge subscriptions on
// the publisher's connected account, so there is no safe "off" switch here yet.
export async function disableMemberships(
  _publicationUri: string,
): Promise<Result<null, ToggleError>> {
  return Err("unsupported");
}

export type MembershipTierInput = {
  id?: string;
  name: string;
  description?: string | null;
  monthly_price_cents: number;
  annual_price_cents?: number | null;
  sort_order?: number;
};

// Stripe's minimum charge is $0.50; require at least $1 to leave room for fees.
const MIN_PRICE_CENTS = 100;

function validTierInput(tier: MembershipTierInput): boolean {
  if (!tier.name.trim()) return false;
  if (
    !Number.isInteger(tier.monthly_price_cents) ||
    tier.monthly_price_cents < MIN_PRICE_CENTS
  )
    return false;
  if (
    tier.annual_price_cents != null &&
    (!Number.isInteger(tier.annual_price_cents) ||
      tier.annual_price_cents < MIN_PRICE_CENTS)
  )
    return false;
  return true;
}

export async function upsertMembershipTier(
  publicationUri: string,
  tier: MembershipTierInput,
): Promise<Result<{ id: string }, TierError>> {
  const owner = await assertPublicationOwner(publicationUri);
  if (!owner) return Err("unauthorized");
  if (!validTierInput(tier)) return Err("invalid_tier");

  // Products and prices are provisioned on the publisher's connected account
  // (direct-charge model), so we need that account before touching Stripe.
  const stripeAccount = owner.connectedAccount?.stripe_account_id;
  if (!stripeAccount) return Err("no_connected_account");

  const name = tier.name.trim();
  const description = tier.description?.trim() || null;

  let existing = null;
  if (tier.id) {
    const { data } = await supabaseServerClient
      .from("publication_membership_tiers")
      .select("*")
      .eq("id", tier.id)
      .eq("publication", publicationUri)
      .maybeSingle();
    if (!data) return Err("tier_not_found");
    existing = data;
  }

  // Insert the row before touching Stripe so new tiers have an id to stamp
  // into the Product metadata; Stripe ids are written back afterwards.
  let rowId = existing?.id;
  if (!rowId) {
    const { data, error } = await supabaseServerClient
      .from("publication_membership_tiers")
      .insert({
        publication: publicationUri,
        name,
        description,
        monthly_price_cents: tier.monthly_price_cents,
        annual_price_cents: tier.annual_price_cents ?? null,
        sort_order: tier.sort_order ?? 0,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[membershipSettings] tier insert failed:", error);
      return Err("database_error");
    }
    rowId = data.id;
  }

  const stripe = getStripe();
  let productId = existing?.stripe_product_id ?? null;
  let monthlyPriceId = existing?.stripe_price_monthly_id ?? null;
  let annualPriceId = existing?.stripe_price_annual_id ?? null;

  try {
    if (productId) {
      if (name !== existing?.name || description !== existing?.description) {
        await stripe.products.update(
          productId,
          { name, description: description ?? "" },
          { stripeAccount },
        );
      }
    } else {
      const product = await stripe.products.create(
        {
          name,
          ...(description ? { description } : {}),
          metadata: {
            kind: "publication_membership_tier",
            publication: publicationUri,
            tier_id: rowId,
          },
        },
        { idempotencyKey: `membership-tier-product-${rowId}`, stripeAccount },
      );
      productId = product.id;
    }

    // Stripe Prices are immutable: an amount change means a new Price and
    // deactivating the old one (existing subscriptions keep their old price).
    const syncPrice = async (
      currentPriceId: string | null,
      currentAmount: number | null,
      newAmount: number | null,
      interval: "month" | "year",
    ): Promise<string | null> => {
      if (newAmount == null) {
        if (currentPriceId)
          await stripe.prices.update(
            currentPriceId,
            { active: false },
            { stripeAccount },
          );
        return null;
      }
      if (currentPriceId && currentAmount === newAmount) return currentPriceId;
      if (currentPriceId)
        await stripe.prices.update(
          currentPriceId,
          { active: false },
          { stripeAccount },
        );
      const price = await stripe.prices.create(
        {
          product: productId!,
          unit_amount: newAmount,
          currency: "usd",
          recurring: { interval },
          metadata: {
            kind: "publication_membership_tier",
            publication: publicationUri,
            tier_id: rowId!,
          },
        },
        { stripeAccount },
      );
      return price.id;
    };

    monthlyPriceId = await syncPrice(
      monthlyPriceId,
      existing?.monthly_price_cents ?? null,
      tier.monthly_price_cents,
      "month",
    );
    annualPriceId = await syncPrice(
      annualPriceId,
      existing?.annual_price_cents ?? null,
      tier.annual_price_cents ?? null,
      "year",
    );
  } catch (e) {
    console.error("[membershipSettings] stripe sync failed:", e);
    return Err("stripe_error");
  }

  const { error } = await supabaseServerClient
    .from("publication_membership_tiers")
    .update({
      name,
      description,
      monthly_price_cents: tier.monthly_price_cents,
      annual_price_cents: tier.annual_price_cents ?? null,
      sort_order: tier.sort_order ?? existing?.sort_order ?? 0,
      stripe_product_id: productId,
      stripe_price_monthly_id: monthlyPriceId,
      stripe_price_annual_id: annualPriceId,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId);
  if (error) {
    console.error("[membershipSettings] tier update failed:", error);
    return Err("database_error");
  }
  return Ok({ id: rowId });
}

// Soft delete: existing members keep their subscriptions (and access) until
// they cancel; the tier just stops being offered.
export async function deleteMembershipTier(
  publicationUri: string,
  tierId: string,
): Promise<Result<null, TierError>> {
  const owner = await assertPublicationOwner(publicationUri);
  if (!owner) return Err("unauthorized");
  const stripeAccount = owner.connectedAccount?.stripe_account_id;
  if (!stripeAccount) return Err("no_connected_account");

  const { data: existing } = await supabaseServerClient
    .from("publication_membership_tiers")
    .select("*")
    .eq("id", tierId)
    .eq("publication", publicationUri)
    .maybeSingle();
  if (!existing) return Err("tier_not_found");

  const stripe = getStripe();
  try {
    for (const priceId of [
      existing.stripe_price_monthly_id,
      existing.stripe_price_annual_id,
    ]) {
      if (priceId)
        await stripe.prices.update(
          priceId,
          { active: false },
          { stripeAccount },
        );
    }
    if (existing.stripe_product_id)
      await stripe.products.update(
        existing.stripe_product_id,
        { active: false },
        { stripeAccount },
      );
  } catch (e) {
    console.error("[membershipSettings] stripe deactivate failed:", e);
    return Err("stripe_error");
  }

  const { error } = await supabaseServerClient
    .from("publication_membership_tiers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", tierId);
  if (error) {
    console.error("[membershipSettings] tier delete failed:", error);
    return Err("database_error");
  }
  return Ok(null);
}
