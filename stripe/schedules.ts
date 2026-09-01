import type Stripe from "stripe";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";

export function scheduleIdOf(sub: Stripe.Subscription): string | null {
  return typeof sub.schedule === "string"
    ? sub.schedule
    : sub.schedule?.id ?? null;
}

// A downgrade is a subscription schedule that swaps the price when the current
// period ends. Releasing it leaves the subscription on its current price.
export async function releaseSchedule(
  sub: Stripe.Subscription,
  opts: { stripeAccount: string },
) {
  const scheduleId = scheduleIdOf(sub);
  if (scheduleId)
    await getStripe().subscriptionSchedules.release(scheduleId, opts);
}

// Members scheduled to move onto a tier stay on their current plan once that
// tier is retired, rather than transitioning onto an archived price.
export async function releasePendingDowngradesToTier(tierId: string) {
  const { data: pending, error } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, stripe_subscription_id, stripe_account_id")
    .eq("pending_tier", tierId);
  if (error) throw error;
  const stripe = getStripe();
  for (const m of pending ?? []) {
    if (m.stripe_subscription_id && m.stripe_account_id) {
      const opts = { stripeAccount: m.stripe_account_id };
      const sub = await stripe.subscriptions.retrieve(
        m.stripe_subscription_id,
        opts,
      );
      await releaseSchedule(sub, opts);
    }
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        pending_tier: null,
        pending_cadence: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", m.id);
  }
}
