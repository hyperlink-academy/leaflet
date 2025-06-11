create table "public"."bsky_profiles" (
    "did" text not null,
    "record" jsonb not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."bsky_profiles" enable row level security;

CREATE UNIQUE INDEX bsky_profiles_pkey ON public.bsky_profiles USING btree (did);

alter table "public"."bsky_profiles" add constraint "bsky_profiles_pkey" PRIMARY KEY using index "bsky_profiles_pkey";

alter table "public"."bsky_profiles" add constraint "bsky_profiles_did_fkey" FOREIGN KEY (did) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;

alter table "public"."bsky_profiles" validate constraint "bsky_profiles_did_fkey";

alter table "public"."publication_subscriptions" add constraint "publication_subscriptions_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;

alter table "public"."publication_subscriptions" validate constraint "publication_subscriptions_identity_fkey";

grant delete on table "public"."bsky_profiles" to "anon";

grant insert on table "public"."bsky_profiles" to "anon";

grant references on table "public"."bsky_profiles" to "anon";

grant select on table "public"."bsky_profiles" to "anon";

grant trigger on table "public"."bsky_profiles" to "anon";

grant truncate on table "public"."bsky_profiles" to "anon";

grant update on table "public"."bsky_profiles" to "anon";

grant delete on table "public"."bsky_profiles" to "authenticated";

grant insert on table "public"."bsky_profiles" to "authenticated";

grant references on table "public"."bsky_profiles" to "authenticated";

grant select on table "public"."bsky_profiles" to "authenticated";

grant trigger on table "public"."bsky_profiles" to "authenticated";

grant truncate on table "public"."bsky_profiles" to "authenticated";

grant update on table "public"."bsky_profiles" to "authenticated";

grant delete on table "public"."bsky_profiles" to "service_role";

grant insert on table "public"."bsky_profiles" to "service_role";

grant references on table "public"."bsky_profiles" to "service_role";

grant select on table "public"."bsky_profiles" to "service_role";

grant trigger on table "public"."bsky_profiles" to "service_role";

grant truncate on table "public"."bsky_profiles" to "service_role";

grant update on table "public"."bsky_profiles" to "service_role";
