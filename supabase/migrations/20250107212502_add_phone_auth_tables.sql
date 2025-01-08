create type "public"."rsvp_status" as enum ('GOING', 'NOT_GOING', 'MAYBE');

create table "public"."phone_number_auth_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "confirmed" boolean not null default false,
    "confirmation_code" text not null,
    "phone_number" text not null,
    "country_code" text not null
);


alter table "public"."phone_number_auth_tokens" enable row level security;

create table "public"."phone_rsvps_to_entity" (
    "created_at" timestamp with time zone not null default now(),
    "phone_number" text not null,
    "country_code" text not null,
    "status" rsvp_status not null,
    "id" uuid not null default gen_random_uuid(),
    "entity" uuid not null,
    "name" text not null default ''::text
);


alter table "public"."phone_rsvps_to_entity" enable row level security;

CREATE UNIQUE INDEX phone_number_auth_tokens_pkey ON public.phone_number_auth_tokens USING btree (id);

CREATE UNIQUE INDEX phone_rsvps_to_entity_pkey ON public.phone_rsvps_to_entity USING btree (id);

CREATE UNIQUE INDEX unique_phone_number_entities ON public.phone_rsvps_to_entity USING btree (phone_number, entity);

alter table "public"."phone_number_auth_tokens" add constraint "phone_number_auth_tokens_pkey" PRIMARY KEY using index "phone_number_auth_tokens_pkey";

alter table "public"."phone_rsvps_to_entity" add constraint "phone_rsvps_to_entity_pkey" PRIMARY KEY using index "phone_rsvps_to_entity_pkey";

alter table "public"."phone_rsvps_to_entity" add constraint "phone_rsvps_to_entity_entity_fkey" FOREIGN KEY (entity) REFERENCES entities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."phone_rsvps_to_entity" validate constraint "phone_rsvps_to_entity_entity_fkey";

grant delete on table "public"."phone_number_auth_tokens" to "anon";

grant insert on table "public"."phone_number_auth_tokens" to "anon";

grant references on table "public"."phone_number_auth_tokens" to "anon";

grant select on table "public"."phone_number_auth_tokens" to "anon";

grant trigger on table "public"."phone_number_auth_tokens" to "anon";

grant truncate on table "public"."phone_number_auth_tokens" to "anon";

grant update on table "public"."phone_number_auth_tokens" to "anon";

grant delete on table "public"."phone_number_auth_tokens" to "authenticated";

grant insert on table "public"."phone_number_auth_tokens" to "authenticated";

grant references on table "public"."phone_number_auth_tokens" to "authenticated";

grant select on table "public"."phone_number_auth_tokens" to "authenticated";

grant trigger on table "public"."phone_number_auth_tokens" to "authenticated";

grant truncate on table "public"."phone_number_auth_tokens" to "authenticated";

grant update on table "public"."phone_number_auth_tokens" to "authenticated";

grant delete on table "public"."phone_number_auth_tokens" to "service_role";

grant insert on table "public"."phone_number_auth_tokens" to "service_role";

grant references on table "public"."phone_number_auth_tokens" to "service_role";

grant select on table "public"."phone_number_auth_tokens" to "service_role";

grant trigger on table "public"."phone_number_auth_tokens" to "service_role";

grant truncate on table "public"."phone_number_auth_tokens" to "service_role";

grant update on table "public"."phone_number_auth_tokens" to "service_role";

grant delete on table "public"."phone_rsvps_to_entity" to "anon";

grant insert on table "public"."phone_rsvps_to_entity" to "anon";

grant references on table "public"."phone_rsvps_to_entity" to "anon";

grant select on table "public"."phone_rsvps_to_entity" to "anon";

grant trigger on table "public"."phone_rsvps_to_entity" to "anon";

grant truncate on table "public"."phone_rsvps_to_entity" to "anon";

grant update on table "public"."phone_rsvps_to_entity" to "anon";

grant delete on table "public"."phone_rsvps_to_entity" to "authenticated";

grant insert on table "public"."phone_rsvps_to_entity" to "authenticated";

grant references on table "public"."phone_rsvps_to_entity" to "authenticated";

grant select on table "public"."phone_rsvps_to_entity" to "authenticated";

grant trigger on table "public"."phone_rsvps_to_entity" to "authenticated";

grant truncate on table "public"."phone_rsvps_to_entity" to "authenticated";

grant update on table "public"."phone_rsvps_to_entity" to "authenticated";

grant delete on table "public"."phone_rsvps_to_entity" to "service_role";

grant insert on table "public"."phone_rsvps_to_entity" to "service_role";

grant references on table "public"."phone_rsvps_to_entity" to "service_role";

grant select on table "public"."phone_rsvps_to_entity" to "service_role";

grant trigger on table "public"."phone_rsvps_to_entity" to "service_role";

grant truncate on table "public"."phone_rsvps_to_entity" to "service_role";

grant update on table "public"."phone_rsvps_to_entity" to "service_role";
