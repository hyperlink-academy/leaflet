create table "public"."bsky_follows" (
    "identity" text not null,
    "follows" text not null
);

alter table "public"."bsky_follows" enable row level security;

CREATE UNIQUE INDEX bsky_follows_pkey ON public.bsky_follows USING btree (identity, follows);

CREATE INDEX facts_reference_idx ON public.facts USING btree (((data ->> 'value'::text))) WHERE (((data ->> 'type'::text) = 'reference'::text) OR ((data ->> 'type'::text) = 'ordered-reference'::text));

alter table "public"."bsky_follows" add constraint "bsky_follows_pkey" PRIMARY KEY using index "bsky_follows_pkey";

alter table "public"."bsky_follows" add constraint "bsky_follows_follows_fkey" FOREIGN KEY (follows) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;

alter table "public"."bsky_follows" validate constraint "bsky_follows_follows_fkey";

alter table "public"."bsky_follows" add constraint "bsky_follows_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;

alter table "public"."bsky_follows" validate constraint "bsky_follows_identity_fkey";

grant delete on table "public"."bsky_follows" to "anon";

grant insert on table "public"."bsky_follows" to "anon";

grant references on table "public"."bsky_follows" to "anon";

grant select on table "public"."bsky_follows" to "anon";

grant trigger on table "public"."bsky_follows" to "anon";

grant truncate on table "public"."bsky_follows" to "anon";

grant update on table "public"."bsky_follows" to "anon";

grant delete on table "public"."bsky_follows" to "authenticated";

grant insert on table "public"."bsky_follows" to "authenticated";

grant references on table "public"."bsky_follows" to "authenticated";

grant select on table "public"."bsky_follows" to "authenticated";

grant trigger on table "public"."bsky_follows" to "authenticated";

grant truncate on table "public"."bsky_follows" to "authenticated";

grant update on table "public"."bsky_follows" to "authenticated";

grant delete on table "public"."bsky_follows" to "service_role";

grant insert on table "public"."bsky_follows" to "service_role";

grant references on table "public"."bsky_follows" to "service_role";

grant select on table "public"."bsky_follows" to "service_role";

grant trigger on table "public"."bsky_follows" to "service_role";

grant truncate on table "public"."bsky_follows" to "service_role";

grant update on table "public"."bsky_follows" to "service_role";
