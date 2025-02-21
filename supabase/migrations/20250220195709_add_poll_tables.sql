create table "public"."poll_votes_on_entity" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "poll_entity" uuid not null,
    "option_entity" uuid not null,
    "voter_token" uuid not null
);


alter table "public"."poll_votes_on_entity" enable row level security;

CREATE UNIQUE INDEX poll_votes_on_entity_pkey ON public.poll_votes_on_entity USING btree (id);

alter table "public"."poll_votes_on_entity" add constraint "poll_votes_on_entity_pkey" PRIMARY KEY using index "poll_votes_on_entity_pkey";

alter table "public"."poll_votes_on_entity" add constraint "poll_votes_on_entity_option_entity_fkey" FOREIGN KEY (option_entity) REFERENCES entities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."poll_votes_on_entity" validate constraint "poll_votes_on_entity_option_entity_fkey";

alter table "public"."poll_votes_on_entity" add constraint "poll_votes_on_entity_poll_entity_fkey" FOREIGN KEY (poll_entity) REFERENCES entities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."poll_votes_on_entity" validate constraint "poll_votes_on_entity_poll_entity_fkey";

grant delete on table "public"."poll_votes_on_entity" to "anon";

grant insert on table "public"."poll_votes_on_entity" to "anon";

grant references on table "public"."poll_votes_on_entity" to "anon";

grant select on table "public"."poll_votes_on_entity" to "anon";

grant trigger on table "public"."poll_votes_on_entity" to "anon";

grant truncate on table "public"."poll_votes_on_entity" to "anon";

grant update on table "public"."poll_votes_on_entity" to "anon";

grant delete on table "public"."poll_votes_on_entity" to "authenticated";

grant insert on table "public"."poll_votes_on_entity" to "authenticated";

grant references on table "public"."poll_votes_on_entity" to "authenticated";

grant select on table "public"."poll_votes_on_entity" to "authenticated";

grant trigger on table "public"."poll_votes_on_entity" to "authenticated";

grant truncate on table "public"."poll_votes_on_entity" to "authenticated";

grant update on table "public"."poll_votes_on_entity" to "authenticated";

grant delete on table "public"."poll_votes_on_entity" to "service_role";

grant insert on table "public"."poll_votes_on_entity" to "service_role";

grant references on table "public"."poll_votes_on_entity" to "service_role";

grant select on table "public"."poll_votes_on_entity" to "service_role";

grant trigger on table "public"."poll_votes_on_entity" to "service_role";

grant truncate on table "public"."poll_votes_on_entity" to "service_role";

grant update on table "public"."poll_votes_on_entity" to "service_role";
