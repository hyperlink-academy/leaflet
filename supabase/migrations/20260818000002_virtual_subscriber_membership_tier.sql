-- Subscriber membership is derived from publication subscription rows. Keep
-- its display metadata on membership settings; tier and membership rows are
-- exclusively paid relationships.

-- These states were never valid product behavior. Abort before changing
-- anything if internal testing produced one, because silently deleting or
-- reassigning a Stripe-backed relationship would be unsafe.
do $$
begin
  if exists (
    select 1
    from public.publication_memberships membership
    left join public.publication_membership_tiers tier on tier.id = membership.tier
    where membership.tier is null
       or tier.is_free
       or tier.publication <> membership.publication
  ) then
    raise exception 'membership rows must reference a paid tier in their own publication';
  end if;

  if exists (
    select 1
    from public.publication_membership_tiers
    where not is_free
      and (
        monthly_price_cents < 100
        or (annual_price_cents is not null and annual_price_cents < 100)
      )
  ) then
    raise exception 'paid membership tier prices must be at least 100 cents';
  end if;
end $$;

alter table public.publication_membership_settings
  add column subscriber_tier_name text not null default 'Free',
  add column subscriber_tier_description text default 'Subscribe for free to get notified about new posts.';

update public.publication_membership_settings settings
set
  subscriber_tier_name = tier.name,
  subscriber_tier_description = tier.description
from public.publication_membership_tiers tier
where tier.publication = settings.publication
  and tier.is_free;

delete from public.publication_membership_tiers
where is_free;

drop index public.publication_membership_tiers_one_free_idx;

alter table public.publication_membership_tiers
  drop column is_free,
  alter column active set default false;

-- A failed Stripe provisioning attempt is not an offer readers can join.
update public.publication_membership_tiers
set active = false
where stripe_price_monthly_id is null;

CREATE UNIQUE INDEX publication_membership_tiers_id_publication_key
  ON public.publication_membership_tiers (id, publication);

alter table public.publication_membership_tiers
  add constraint publication_membership_tiers_id_publication_key
    UNIQUE using index publication_membership_tiers_id_publication_key,
  add constraint publication_membership_tiers_monthly_price_check
    CHECK (monthly_price_cents >= 100),
  add constraint publication_membership_tiers_annual_price_check
    CHECK (annual_price_cents IS NULL OR annual_price_cents >= 100),
  add constraint publication_membership_tiers_active_monthly_price_check
    CHECK (NOT active OR stripe_price_monthly_id IS NOT NULL);

alter table public.publication_memberships
  drop constraint publication_memberships_tier_fkey,
  alter column tier set not null,
  add constraint publication_memberships_tier_publication_fkey
    FOREIGN KEY (tier, publication)
    REFERENCES public.publication_membership_tiers(id, publication)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;
