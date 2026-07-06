-- Membership billing moves from destination charges (platform account) to
-- direct charges on the publisher's connected account. Two new tables track the
-- platform wallet (one card per reader, cloned to each publisher's account) and
-- the per-account customer that card is cloned onto. publication_memberships
-- gains the account/price/cadence the subscription actually lives on so we never
-- re-derive it from the current owner.

-- stripe_wallets --------------------------------------------------------------
-- One row per reader: the shared platform customer plus the saved off-session
-- card that gets cloned to publishers' connected accounts at join time. Card
-- display fields are cached for the "Join with ···4242" UI.
create table "public"."stripe_wallets" (
    "identity_id" uuid not null,
    "stripe_customer_id" text not null,
    "default_payment_method_id" text,
    "card_brand" text,
    "card_last4" text,
    "card_exp_month" integer,
    "card_exp_year" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."stripe_wallets" enable row level security;

CREATE UNIQUE INDEX stripe_wallets_pkey ON public.stripe_wallets USING btree (identity_id);

alter table "public"."stripe_wallets" add constraint "stripe_wallets_pkey" PRIMARY KEY using index "stripe_wallets_pkey";
alter table "public"."stripe_wallets" add constraint "stripe_wallets_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;

-- stripe_connected_customers --------------------------------------------------
-- The reader's customer on a given publisher's connected account. Reused across
-- all of that publisher's publications so a reader never accumulates duplicate
-- customers on the same account.
create table "public"."stripe_connected_customers" (
    "identity_id" uuid not null,
    "stripe_account_id" text not null,
    "stripe_customer_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."stripe_connected_customers" enable row level security;

CREATE UNIQUE INDEX stripe_connected_customers_pkey ON public.stripe_connected_customers USING btree (identity_id, stripe_account_id);

alter table "public"."stripe_connected_customers" add constraint "stripe_connected_customers_pkey" PRIMARY KEY using index "stripe_connected_customers_pkey";
alter table "public"."stripe_connected_customers" add constraint "stripe_connected_customers_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;

-- publication_memberships direct-charge columns -------------------------------
-- The subscription now lives on the publisher's connected account. Store the
-- account id (never re-derive from the current owner), the exact price, and the
-- billing cadence so management UI can render/switch without a Stripe round-trip.
alter table "public"."publication_memberships" add column "stripe_account_id" text;
alter table "public"."publication_memberships" add column "cadence" text;
alter table "public"."publication_memberships" add column "stripe_price_id" text;

-- Grants -----------------------------------------------------------------------
do $$
declare
  t text;
  r text;
begin
  foreach t in array array[
    'stripe_wallets',
    'stripe_connected_customers'
  ] loop
    foreach r in array array['anon','authenticated','service_role'] loop
      execute format(
        'grant delete, insert, references, select, trigger, truncate, update on table public.%I to %I',
        t, r
      );
    end loop;
  end loop;
end $$;
