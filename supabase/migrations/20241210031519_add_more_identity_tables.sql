create table "public"."email_auth_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "confirmed" boolean not null default false,
    "email" text not null,
    "confirmation_code" text not null,
    "identity" uuid
);

alter table "public"."email_auth_tokens" enable row level security;

alter table "public"."identities" add column "email" text;

CREATE UNIQUE INDEX email_auth_tokens_pkey ON public.email_auth_tokens USING btree (id);

alter table "public"."email_auth_tokens" add constraint "email_auth_tokens_pkey" PRIMARY KEY using index "email_auth_tokens_pkey";

alter table "public"."email_auth_tokens" add constraint "email_auth_tokens_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."email_auth_tokens" validate constraint "email_auth_tokens_identity_fkey";

grant delete on table "public"."email_auth_tokens" to "anon";

grant insert on table "public"."email_auth_tokens" to "anon";

grant references on table "public"."email_auth_tokens" to "anon";

grant select on table "public"."email_auth_tokens" to "anon";

grant trigger on table "public"."email_auth_tokens" to "anon";

grant truncate on table "public"."email_auth_tokens" to "anon";

grant update on table "public"."email_auth_tokens" to "anon";

grant delete on table "public"."email_auth_tokens" to "authenticated";

grant insert on table "public"."email_auth_tokens" to "authenticated";

grant references on table "public"."email_auth_tokens" to "authenticated";

grant select on table "public"."email_auth_tokens" to "authenticated";

grant trigger on table "public"."email_auth_tokens" to "authenticated";

grant truncate on table "public"."email_auth_tokens" to "authenticated";

grant update on table "public"."email_auth_tokens" to "authenticated";

grant delete on table "public"."email_auth_tokens" to "service_role";

grant insert on table "public"."email_auth_tokens" to "service_role";

grant references on table "public"."email_auth_tokens" to "service_role";

grant select on table "public"."email_auth_tokens" to "service_role";

grant trigger on table "public"."email_auth_tokens" to "service_role";

grant truncate on table "public"."email_auth_tokens" to "service_role";

grant update on table "public"."email_auth_tokens" to "service_role";
