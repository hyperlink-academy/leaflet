create table "public"."entities" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."entities" enable row level security;

create table "public"."facts" (
    "id" uuid not null default gen_random_uuid(),
    "entity" uuid not null,
    "attribute" text not null,
    "data" jsonb not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone,
    "version" bigint not null default '0'::bigint
);


alter table "public"."facts" enable row level security;

create table "public"."replicache_clients" (
    "client_id" text not null,
    "client_group" text not null,
    "last_mutation" bigint not null
);


alter table "public"."replicache_clients" enable row level security;

CREATE UNIQUE INDEX client_pkey ON public.replicache_clients USING btree (client_id);

CREATE UNIQUE INDEX entities_pkey ON public.entities USING btree (id);

CREATE INDEX facts_expr_idx ON public.facts USING btree (((data ->> 'value'::text))) WHERE ((data ->> 'type'::text) = 'reference'::text);

CREATE UNIQUE INDEX facts_pkey ON public.facts USING btree (id);

alter table "public"."entities" add constraint "entities_pkey" PRIMARY KEY using index "entities_pkey";

alter table "public"."facts" add constraint "facts_pkey" PRIMARY KEY using index "facts_pkey";

alter table "public"."replicache_clients" add constraint "client_pkey" PRIMARY KEY using index "client_pkey";

alter table "public"."facts" add constraint "facts_entity_fkey" FOREIGN KEY (entity) REFERENCES entities(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."facts" validate constraint "facts_entity_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_facts(root uuid)
 RETURNS SETOF facts
 LANGUAGE sql
AS $function$
 WITH RECURSIVE all_facts as (
    select
      *
    from
      facts
    where
      entity = root
    union
    select
      f.*
    from
      facts f
      inner join all_facts f1 on (
         uuid(f1.data ->> 'value') = f.entity
      ) where f1.data ->> 'type' = 'reference'
  )
select
  *
from
  all_facts;
  $function$
;

grant delete on table "public"."entities" to "anon";

grant insert on table "public"."entities" to "anon";

grant references on table "public"."entities" to "anon";

grant select on table "public"."entities" to "anon";

grant trigger on table "public"."entities" to "anon";

grant truncate on table "public"."entities" to "anon";

grant update on table "public"."entities" to "anon";

grant delete on table "public"."entities" to "authenticated";

grant insert on table "public"."entities" to "authenticated";

grant references on table "public"."entities" to "authenticated";

grant select on table "public"."entities" to "authenticated";

grant trigger on table "public"."entities" to "authenticated";

grant truncate on table "public"."entities" to "authenticated";

grant update on table "public"."entities" to "authenticated";

grant delete on table "public"."entities" to "service_role";

grant insert on table "public"."entities" to "service_role";

grant references on table "public"."entities" to "service_role";

grant select on table "public"."entities" to "service_role";

grant trigger on table "public"."entities" to "service_role";

grant truncate on table "public"."entities" to "service_role";

grant update on table "public"."entities" to "service_role";

grant delete on table "public"."facts" to "anon";

grant insert on table "public"."facts" to "anon";

grant references on table "public"."facts" to "anon";

grant select on table "public"."facts" to "anon";

grant trigger on table "public"."facts" to "anon";

grant truncate on table "public"."facts" to "anon";

grant update on table "public"."facts" to "anon";

grant delete on table "public"."facts" to "authenticated";

grant insert on table "public"."facts" to "authenticated";

grant references on table "public"."facts" to "authenticated";

grant select on table "public"."facts" to "authenticated";

grant trigger on table "public"."facts" to "authenticated";

grant truncate on table "public"."facts" to "authenticated";

grant update on table "public"."facts" to "authenticated";

grant delete on table "public"."facts" to "service_role";

grant insert on table "public"."facts" to "service_role";

grant references on table "public"."facts" to "service_role";

grant select on table "public"."facts" to "service_role";

grant trigger on table "public"."facts" to "service_role";

grant truncate on table "public"."facts" to "service_role";

grant update on table "public"."facts" to "service_role";

grant delete on table "public"."replicache_clients" to "anon";

grant insert on table "public"."replicache_clients" to "anon";

grant references on table "public"."replicache_clients" to "anon";

grant select on table "public"."replicache_clients" to "anon";

grant trigger on table "public"."replicache_clients" to "anon";

grant truncate on table "public"."replicache_clients" to "anon";

grant update on table "public"."replicache_clients" to "anon";

grant delete on table "public"."replicache_clients" to "authenticated";

grant insert on table "public"."replicache_clients" to "authenticated";

grant references on table "public"."replicache_clients" to "authenticated";

grant select on table "public"."replicache_clients" to "authenticated";

grant trigger on table "public"."replicache_clients" to "authenticated";

grant truncate on table "public"."replicache_clients" to "authenticated";

grant update on table "public"."replicache_clients" to "authenticated";

grant delete on table "public"."replicache_clients" to "service_role";

grant insert on table "public"."replicache_clients" to "service_role";

grant references on table "public"."replicache_clients" to "service_role";

grant select on table "public"."replicache_clients" to "service_role";

grant trigger on table "public"."replicache_clients" to "service_role";

grant truncate on table "public"."replicache_clients" to "service_role";

grant update on table "public"."replicache_clients" to "service_role";
