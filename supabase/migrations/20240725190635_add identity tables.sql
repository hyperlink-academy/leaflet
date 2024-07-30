create table "public"."identities" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "home_page" uuid not null
);


alter table "public"."identities" enable row level security;

create table "public"."permission_token_on_homepage" (
    "token" uuid not null,
    "identity" uuid not null
);


alter table "public"."permission_token_on_homepage" enable row level security;

CREATE UNIQUE INDEX identities_pkey ON public.identities USING btree (id);

CREATE UNIQUE INDEX permission_token_creator_pkey ON public.permission_token_on_homepage USING btree (token, identity);

alter table "public"."identities" add constraint "identities_pkey" PRIMARY KEY using index "identities_pkey";

alter table "public"."permission_token_on_homepage" add constraint "permission_token_creator_pkey" PRIMARY KEY using index "permission_token_creator_pkey";

alter table "public"."identities" add constraint "identities_home_page_fkey" FOREIGN KEY (home_page) REFERENCES permission_tokens(id) ON DELETE CASCADE not valid;

alter table "public"."identities" validate constraint "identities_home_page_fkey";

alter table "public"."permission_token_on_homepage" add constraint "permission_token_creator_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(id) ON DELETE CASCADE not valid;

alter table "public"."permission_token_on_homepage" validate constraint "permission_token_creator_identity_fkey";

alter table "public"."permission_token_on_homepage" add constraint "permission_token_creator_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) ON DELETE CASCADE not valid;

alter table "public"."permission_token_on_homepage" validate constraint "permission_token_creator_token_fkey";

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

grant delete on table "public"."permission_token_on_homepage" to "anon";

grant insert on table "public"."permission_token_on_homepage" to "anon";

grant references on table "public"."permission_token_on_homepage" to "anon";

grant select on table "public"."permission_token_on_homepage" to "anon";

grant trigger on table "public"."permission_token_on_homepage" to "anon";

grant truncate on table "public"."permission_token_on_homepage" to "anon";

grant update on table "public"."permission_token_on_homepage" to "anon";

grant delete on table "public"."permission_token_on_homepage" to "authenticated";

grant insert on table "public"."permission_token_on_homepage" to "authenticated";

grant references on table "public"."permission_token_on_homepage" to "authenticated";

grant select on table "public"."permission_token_on_homepage" to "authenticated";

grant trigger on table "public"."permission_token_on_homepage" to "authenticated";

grant truncate on table "public"."permission_token_on_homepage" to "authenticated";

grant update on table "public"."permission_token_on_homepage" to "authenticated";

grant delete on table "public"."permission_token_on_homepage" to "service_role";

grant insert on table "public"."permission_token_on_homepage" to "service_role";

grant references on table "public"."permission_token_on_homepage" to "service_role";

grant select on table "public"."permission_token_on_homepage" to "service_role";

grant trigger on table "public"."permission_token_on_homepage" to "service_role";

grant truncate on table "public"."permission_token_on_homepage" to "service_role";

grant update on table "public"."permission_token_on_homepage" to "service_role";
