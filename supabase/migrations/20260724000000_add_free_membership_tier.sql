-- A non-removable, always-free tier for membership publications. Readers who
-- pick it just subscribe to the publication (no paid membership, no Stripe
-- product/prices). Exactly one per publication; created when memberships are
-- enabled and backfilled here for already-enabled publications.

alter table "public"."publication_membership_tiers"
  add column "is_free" boolean not null default false;

-- At most one free tier per publication.
CREATE UNIQUE INDEX publication_membership_tiers_one_free_idx
  ON public.publication_membership_tiers (publication)
  WHERE is_free;

-- Backfill: give every memberships-enabled publication its free tier.
insert into public.publication_membership_tiers
  (publication, name, description, monthly_price_cents, annual_price_cents, is_free, active, sort_order)
select s.publication, 'Free', 'Subscribe for free to get notified about new posts.', 0, null, true, true, 0
from public.publication_membership_settings s
where s.enabled
  and not exists (
    select 1 from public.publication_membership_tiers t
    where t.publication = s.publication and t.is_free
  );
