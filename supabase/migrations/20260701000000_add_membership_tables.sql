-- Paid memberships for publications. Three new tables plus a members_only flag
-- on documents_in_publications. Mirrors the newsletter feature's settings table;
-- billing rides on the existing Stripe Connect merchant accounts
-- (stripe_connected_accounts) via destination charges.

-- publication_membership_settings ---------------------------------------------
-- Per-publication toggle, separate from publications.metadata for cheap
-- "memberships-enabled" queries. Only meaningful once the owning identity has a
-- charges_enabled connected account.
create table "public"."publication_membership_settings" (
    "publication" text not null,
    "enabled" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_membership_settings" enable row level security;

CREATE UNIQUE INDEX publication_membership_settings_pkey ON public.publication_membership_settings USING btree (publication);
CREATE INDEX publication_membership_settings_enabled_idx ON public.publication_membership_settings USING btree (publication) WHERE enabled;

alter table "public"."publication_membership_settings" add constraint "publication_membership_settings_pkey" PRIMARY KEY using index "publication_membership_settings_pkey";
alter table "public"."publication_membership_settings" add constraint "publication_membership_settings_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE;

-- publication_membership_tiers ------------------------------------------------
-- Priced tiers a publisher offers. Stripe Product/Prices live on the platform
-- account (destination-charge model); ids cached here after creation.
create table "public"."publication_membership_tiers" (
    "id" uuid not null default gen_random_uuid(),
    "publication" text not null,
    "name" text not null,
    "description" text,
    "monthly_price_cents" integer not null,
    "annual_price_cents" integer,
    "currency" text not null default 'usd',
    "stripe_product_id" text,
    "stripe_price_monthly_id" text,
    "stripe_price_annual_id" text,
    "active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_membership_tiers" enable row level security;

CREATE UNIQUE INDEX publication_membership_tiers_pkey ON public.publication_membership_tiers USING btree (id);
CREATE INDEX publication_membership_tiers_publication_idx ON public.publication_membership_tiers USING btree (publication) WHERE active;

alter table "public"."publication_membership_tiers" add constraint "publication_membership_tiers_pkey" PRIMARY KEY using index "publication_membership_tiers_pkey";
alter table "public"."publication_membership_tiers" add constraint "publication_membership_tiers_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE;

-- publication_memberships -----------------------------------------------------
-- A reader's paid relationship to a publication. Keyed on identities.id so both
-- atproto and email readers are covered. An "active"/"trialing" row unlocks
-- members-only content.
create table "public"."publication_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "publication" text not null,
    "identity_id" uuid not null,
    "tier" uuid,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "status" text,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_memberships" enable row level security;

CREATE UNIQUE INDEX publication_memberships_pkey ON public.publication_memberships USING btree (id);
CREATE UNIQUE INDEX publication_memberships_publication_identity_key ON public.publication_memberships USING btree (publication, identity_id);
CREATE UNIQUE INDEX publication_memberships_stripe_subscription_id_key ON public.publication_memberships USING btree (stripe_subscription_id);
CREATE INDEX publication_memberships_identity_idx ON public.publication_memberships USING btree (identity_id);

alter table "public"."publication_memberships" add constraint "publication_memberships_pkey" PRIMARY KEY using index "publication_memberships_pkey";
alter table "public"."publication_memberships" add constraint "publication_memberships_publication_identity_key" UNIQUE using index "publication_memberships_publication_identity_key";
alter table "public"."publication_memberships" add constraint "publication_memberships_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE;
alter table "public"."publication_memberships" add constraint "publication_memberships_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;
alter table "public"."publication_memberships" add constraint "publication_memberships_tier_fkey" FOREIGN KEY (tier) REFERENCES publication_membership_tiers(id) ON DELETE SET NULL;

-- documents_in_publications.members_only --------------------------------------
-- Top-level flag computed at publish time (post's first page has a members-only
-- delimiter) so the posts list can render a badge without inspecting records.
alter table "public"."documents_in_publications" add column "members_only" boolean not null default false;

-- Grants -----------------------------------------------------------------------
do $$
declare
  t text;
  r text;
begin
  foreach t in array array[
    'publication_membership_settings',
    'publication_membership_tiers',
    'publication_memberships'
  ] loop
    foreach r in array array['anon','authenticated','service_role'] loop
      execute format(
        'grant delete, insert, references, select, trigger, truncate, update on table public.%I to %I',
        t, r
      );
    end loop;
  end loop;
end $$;
