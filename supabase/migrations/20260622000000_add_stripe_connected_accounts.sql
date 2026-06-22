-- stripe_connected_accounts: Stripe Connect (Accounts v2) connected account per identity.
-- One connected account per identity, configured as a merchant so the publisher can
-- collect payments from their readers. Independent of user_subscriptions (Leaflet Pro):
-- a publisher can collect payments with or without a Pro subscription, and vice versa.
create table "public"."stripe_connected_accounts" (
    "identity_id" uuid not null,
    "stripe_account_id" text not null,
    "charges_enabled" boolean not null default false,
    "payouts_enabled" boolean not null default false,
    "details_submitted" boolean not null default false,
    "requirements" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."stripe_connected_accounts" enable row level security;

CREATE UNIQUE INDEX stripe_connected_accounts_pkey ON public.stripe_connected_accounts USING btree (identity_id);

alter table "public"."stripe_connected_accounts" add constraint "stripe_connected_accounts_pkey" PRIMARY KEY using index "stripe_connected_accounts_pkey";

CREATE UNIQUE INDEX stripe_connected_accounts_stripe_account_id_key ON public.stripe_connected_accounts USING btree (stripe_account_id);

alter table "public"."stripe_connected_accounts" add constraint "stripe_connected_accounts_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;

grant delete on table "public"."stripe_connected_accounts" to "anon";
grant insert on table "public"."stripe_connected_accounts" to "anon";
grant references on table "public"."stripe_connected_accounts" to "anon";
grant select on table "public"."stripe_connected_accounts" to "anon";
grant trigger on table "public"."stripe_connected_accounts" to "anon";
grant truncate on table "public"."stripe_connected_accounts" to "anon";
grant update on table "public"."stripe_connected_accounts" to "anon";

grant delete on table "public"."stripe_connected_accounts" to "authenticated";
grant insert on table "public"."stripe_connected_accounts" to "authenticated";
grant references on table "public"."stripe_connected_accounts" to "authenticated";
grant select on table "public"."stripe_connected_accounts" to "authenticated";
grant trigger on table "public"."stripe_connected_accounts" to "authenticated";
grant truncate on table "public"."stripe_connected_accounts" to "authenticated";
grant update on table "public"."stripe_connected_accounts" to "authenticated";

grant delete on table "public"."stripe_connected_accounts" to "service_role";
grant insert on table "public"."stripe_connected_accounts" to "service_role";
grant references on table "public"."stripe_connected_accounts" to "service_role";
grant select on table "public"."stripe_connected_accounts" to "service_role";
grant trigger on table "public"."stripe_connected_accounts" to "service_role";
grant truncate on table "public"."stripe_connected_accounts" to "service_role";
grant update on table "public"."stripe_connected_accounts" to "service_role";
