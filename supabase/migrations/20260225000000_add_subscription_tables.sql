-- user_subscriptions: tracks Stripe subscription state per identity
create table "public"."user_subscriptions" (
    "identity_id" uuid not null,
    "stripe_customer_id" text not null,
    "stripe_subscription_id" text,
    "plan" text,
    "status" text,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."user_subscriptions" enable row level security;

CREATE UNIQUE INDEX user_subscriptions_pkey ON public.user_subscriptions USING btree (identity_id);

alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY using index "user_subscriptions_pkey";

CREATE UNIQUE INDEX user_subscriptions_stripe_customer_id_key ON public.user_subscriptions USING btree (stripe_customer_id);

CREATE UNIQUE INDEX user_subscriptions_stripe_subscription_id_key ON public.user_subscriptions USING btree (stripe_subscription_id);

alter table "public"."user_subscriptions" add constraint "user_subscriptions_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;

grant delete on table "public"."user_subscriptions" to "anon";
grant insert on table "public"."user_subscriptions" to "anon";
grant references on table "public"."user_subscriptions" to "anon";
grant select on table "public"."user_subscriptions" to "anon";
grant trigger on table "public"."user_subscriptions" to "anon";
grant truncate on table "public"."user_subscriptions" to "anon";
grant update on table "public"."user_subscriptions" to "anon";

grant delete on table "public"."user_subscriptions" to "authenticated";
grant insert on table "public"."user_subscriptions" to "authenticated";
grant references on table "public"."user_subscriptions" to "authenticated";
grant select on table "public"."user_subscriptions" to "authenticated";
grant trigger on table "public"."user_subscriptions" to "authenticated";
grant truncate on table "public"."user_subscriptions" to "authenticated";
grant update on table "public"."user_subscriptions" to "authenticated";

grant delete on table "public"."user_subscriptions" to "service_role";
grant insert on table "public"."user_subscriptions" to "service_role";
grant references on table "public"."user_subscriptions" to "service_role";
grant select on table "public"."user_subscriptions" to "service_role";
grant trigger on table "public"."user_subscriptions" to "service_role";
grant truncate on table "public"."user_subscriptions" to "service_role";
grant update on table "public"."user_subscriptions" to "service_role";

-- user_entitlements: feature access decoupled from billing
create table "public"."user_entitlements" (
    "identity_id" uuid not null,
    "entitlement_key" text not null,
    "granted_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "source" text,
    "metadata" jsonb
);

alter table "public"."user_entitlements" enable row level security;

CREATE UNIQUE INDEX user_entitlements_pkey ON public.user_entitlements USING btree (identity_id, entitlement_key);

alter table "public"."user_entitlements" add constraint "user_entitlements_pkey" PRIMARY KEY using index "user_entitlements_pkey";

CREATE INDEX user_entitlements_identity_id_idx ON public.user_entitlements USING btree (identity_id);

CREATE INDEX user_entitlements_expires_at_idx ON public.user_entitlements USING btree (expires_at);

alter table "public"."user_entitlements" add constraint "user_entitlements_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE;

grant delete on table "public"."user_entitlements" to "anon";
grant insert on table "public"."user_entitlements" to "anon";
grant references on table "public"."user_entitlements" to "anon";
grant select on table "public"."user_entitlements" to "anon";
grant trigger on table "public"."user_entitlements" to "anon";
grant truncate on table "public"."user_entitlements" to "anon";
grant update on table "public"."user_entitlements" to "anon";

grant delete on table "public"."user_entitlements" to "authenticated";
grant insert on table "public"."user_entitlements" to "authenticated";
grant references on table "public"."user_entitlements" to "authenticated";
grant select on table "public"."user_entitlements" to "authenticated";
grant trigger on table "public"."user_entitlements" to "authenticated";
grant truncate on table "public"."user_entitlements" to "authenticated";
grant update on table "public"."user_entitlements" to "authenticated";

grant delete on table "public"."user_entitlements" to "service_role";
grant insert on table "public"."user_entitlements" to "service_role";
grant references on table "public"."user_entitlements" to "service_role";
grant select on table "public"."user_entitlements" to "service_role";
grant trigger on table "public"."user_entitlements" to "service_role";
grant truncate on table "public"."user_entitlements" to "service_role";
grant update on table "public"."user_entitlements" to "service_role";
