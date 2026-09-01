-- A downgrade keeps the member on their current plan until the period ends
-- (a Stripe subscription schedule swaps the price then). These mirror the
-- scheduled plan so the UI can show it without a Stripe round trip; the
-- connect-events webhook clears them once the swap lands.
alter table "public"."publication_memberships"
  add column "pending_tier" uuid,
  add column "pending_cadence" text;

alter table "public"."publication_memberships"
  add constraint "publication_memberships_pending_tier_fkey"
  FOREIGN KEY (pending_tier) REFERENCES publication_membership_tiers(id) ON DELETE SET NULL;
