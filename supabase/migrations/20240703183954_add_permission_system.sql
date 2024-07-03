create table "public"."entity_sets" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."entity_sets" enable row level security;

create table "public"."permission_token_rights" (
    "token" uuid not null,
    "entity_set" uuid not null,
    "read" boolean not null default false,
    "write" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "create_token" boolean not null default false,
    "change_entity_set" boolean not null default false
);


alter table "public"."permission_token_rights" enable row level security;

create table "public"."permission_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "root_entity" uuid not null
);


alter table "public"."permission_tokens" enable row level security;

alter table "public"."entities" add column "set" uuid not null;

CREATE UNIQUE INDEX entity_sets_pkey ON public.entity_sets USING btree (id);

CREATE UNIQUE INDEX permission_token_rights_pkey ON public.permission_token_rights USING btree (token, entity_set);

CREATE UNIQUE INDEX permission_tokens_pkey ON public.permission_tokens USING btree (id);

alter table "public"."entity_sets" add constraint "entity_sets_pkey" PRIMARY KEY using index "entity_sets_pkey";

alter table "public"."permission_token_rights" add constraint "permission_token_rights_pkey" PRIMARY KEY using index "permission_token_rights_pkey";

alter table "public"."permission_tokens" add constraint "permission_tokens_pkey" PRIMARY KEY using index "permission_tokens_pkey";

alter table "public"."entities" add constraint "entities_set_fkey" FOREIGN KEY (set) REFERENCES entity_sets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entities" validate constraint "entities_set_fkey";

alter table "public"."permission_token_rights" add constraint "permission_token_rights_entity_set_fkey" FOREIGN KEY (entity_set) REFERENCES entity_sets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."permission_token_rights" validate constraint "permission_token_rights_entity_set_fkey";

alter table "public"."permission_token_rights" add constraint "permission_token_rights_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."permission_token_rights" validate constraint "permission_token_rights_token_fkey";

alter table "public"."permission_tokens" add constraint "permission_tokens_root_entity_fkey" FOREIGN KEY (root_entity) REFERENCES entities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."permission_tokens" validate constraint "permission_tokens_root_entity_fkey";

grant delete on table "public"."entity_sets" to "anon";

grant insert on table "public"."entity_sets" to "anon";

grant references on table "public"."entity_sets" to "anon";

grant select on table "public"."entity_sets" to "anon";

grant trigger on table "public"."entity_sets" to "anon";

grant truncate on table "public"."entity_sets" to "anon";

grant update on table "public"."entity_sets" to "anon";

grant delete on table "public"."entity_sets" to "authenticated";

grant insert on table "public"."entity_sets" to "authenticated";

grant references on table "public"."entity_sets" to "authenticated";

grant select on table "public"."entity_sets" to "authenticated";

grant trigger on table "public"."entity_sets" to "authenticated";

grant truncate on table "public"."entity_sets" to "authenticated";

grant update on table "public"."entity_sets" to "authenticated";

grant delete on table "public"."entity_sets" to "service_role";

grant insert on table "public"."entity_sets" to "service_role";

grant references on table "public"."entity_sets" to "service_role";

grant select on table "public"."entity_sets" to "service_role";

grant trigger on table "public"."entity_sets" to "service_role";

grant truncate on table "public"."entity_sets" to "service_role";

grant update on table "public"."entity_sets" to "service_role";

grant delete on table "public"."permission_token_rights" to "anon";

grant insert on table "public"."permission_token_rights" to "anon";

grant references on table "public"."permission_token_rights" to "anon";

grant select on table "public"."permission_token_rights" to "anon";

grant trigger on table "public"."permission_token_rights" to "anon";

grant truncate on table "public"."permission_token_rights" to "anon";

grant update on table "public"."permission_token_rights" to "anon";

grant delete on table "public"."permission_token_rights" to "authenticated";

grant insert on table "public"."permission_token_rights" to "authenticated";

grant references on table "public"."permission_token_rights" to "authenticated";

grant select on table "public"."permission_token_rights" to "authenticated";

grant trigger on table "public"."permission_token_rights" to "authenticated";

grant truncate on table "public"."permission_token_rights" to "authenticated";

grant update on table "public"."permission_token_rights" to "authenticated";

grant delete on table "public"."permission_token_rights" to "service_role";

grant insert on table "public"."permission_token_rights" to "service_role";

grant references on table "public"."permission_token_rights" to "service_role";

grant select on table "public"."permission_token_rights" to "service_role";

grant trigger on table "public"."permission_token_rights" to "service_role";

grant truncate on table "public"."permission_token_rights" to "service_role";

grant update on table "public"."permission_token_rights" to "service_role";

grant delete on table "public"."permission_tokens" to "anon";

grant insert on table "public"."permission_tokens" to "anon";

grant references on table "public"."permission_tokens" to "anon";

grant select on table "public"."permission_tokens" to "anon";

grant trigger on table "public"."permission_tokens" to "anon";

grant truncate on table "public"."permission_tokens" to "anon";

grant update on table "public"."permission_tokens" to "anon";

grant delete on table "public"."permission_tokens" to "authenticated";

grant insert on table "public"."permission_tokens" to "authenticated";

grant references on table "public"."permission_tokens" to "authenticated";

grant select on table "public"."permission_tokens" to "authenticated";

grant trigger on table "public"."permission_tokens" to "authenticated";

grant truncate on table "public"."permission_tokens" to "authenticated";

grant update on table "public"."permission_tokens" to "authenticated";

grant delete on table "public"."permission_tokens" to "service_role";

grant insert on table "public"."permission_tokens" to "service_role";

grant references on table "public"."permission_tokens" to "service_role";

grant select on table "public"."permission_tokens" to "service_role";

grant trigger on table "public"."permission_tokens" to "service_role";

grant truncate on table "public"."permission_tokens" to "service_role";

grant update on table "public"."permission_tokens" to "service_role";
