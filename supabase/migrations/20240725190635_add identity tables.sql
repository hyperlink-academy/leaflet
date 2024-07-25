create table "public"."identities" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."identities" enable row level security;

create table "public"."permission_token_creator" (
    "token" uuid not null,
    "identity" uuid not null
);


alter table "public"."permission_token_creator" enable row level security;

CREATE UNIQUE INDEX identities_pkey ON public.identities USING btree (id);

CREATE UNIQUE INDEX permission_token_creator_pkey ON public.permission_token_creator USING btree (token, identity);

alter table "public"."identities" add constraint "identities_pkey" PRIMARY KEY using index "identities_pkey";

alter table "public"."permission_token_creator" add constraint "permission_token_creator_pkey" PRIMARY KEY using index "permission_token_creator_pkey";

alter table "public"."permission_token_creator" add constraint "permission_token_creator_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(id) not valid;

alter table "public"."permission_token_creator" validate constraint "permission_token_creator_identity_fkey";

alter table "public"."permission_token_creator" add constraint "permission_token_creator_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) not valid;

alter table "public"."permission_token_creator" validate constraint "permission_token_creator_token_fkey";

grant delete on table "public"."identities" to "anon";

grant insert on table "public"."identities" to "anon";

grant references on table "public"."identities" to "anon";

grant select on table "public"."identities" to "anon";

grant trigger on table "public"."identities" to "anon";

grant truncate on table "public"."identities" to "anon";

grant update on table "public"."identities" to "anon";

grant delete on table "public"."identities" to "authenticated";

grant insert on table "public"."identities" to "authenticated";

grant references on table "public"."identities" to "authenticated";

grant select on table "public"."identities" to "authenticated";

grant trigger on table "public"."identities" to "authenticated";

grant truncate on table "public"."identities" to "authenticated";

grant update on table "public"."identities" to "authenticated";

grant delete on table "public"."identities" to "service_role";

grant insert on table "public"."identities" to "service_role";

grant references on table "public"."identities" to "service_role";

grant select on table "public"."identities" to "service_role";

grant trigger on table "public"."identities" to "service_role";

grant truncate on table "public"."identities" to "service_role";

grant update on table "public"."identities" to "service_role";

grant delete on table "public"."permission_token_creator" to "anon";

grant insert on table "public"."permission_token_creator" to "anon";

grant references on table "public"."permission_token_creator" to "anon";

grant select on table "public"."permission_token_creator" to "anon";

grant trigger on table "public"."permission_token_creator" to "anon";

grant truncate on table "public"."permission_token_creator" to "anon";

grant update on table "public"."permission_token_creator" to "anon";

grant delete on table "public"."permission_token_creator" to "authenticated";

grant insert on table "public"."permission_token_creator" to "authenticated";

grant references on table "public"."permission_token_creator" to "authenticated";

grant select on table "public"."permission_token_creator" to "authenticated";

grant trigger on table "public"."permission_token_creator" to "authenticated";

grant truncate on table "public"."permission_token_creator" to "authenticated";

grant update on table "public"."permission_token_creator" to "authenticated";

grant delete on table "public"."permission_token_creator" to "service_role";

grant insert on table "public"."permission_token_creator" to "service_role";

grant references on table "public"."permission_token_creator" to "service_role";

grant select on table "public"."permission_token_creator" to "service_role";

grant trigger on table "public"."permission_token_creator" to "service_role";

grant truncate on table "public"."permission_token_creator" to "service_role";

grant update on table "public"."permission_token_creator" to "service_role";