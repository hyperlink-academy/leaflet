create table "public"."email_subscriptions_to_entity" (
    "id" uuid not null default gen_random_uuid(),
    "entity" uuid not null,
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "token" uuid not null,
    "confirmed" boolean not null default false,
    "confirmation_code" text not null
);

alter table "public"."email_subscriptions_to_entity" enable row level security;

CREATE UNIQUE INDEX email_subscriptions_to_entity_pkey ON public.email_subscriptions_to_entity USING btree (id);

alter table "public"."email_subscriptions_to_entity" add constraint "email_subscriptions_to_entity_pkey" PRIMARY KEY using index "email_subscriptions_to_entity_pkey";

alter table "public"."email_subscriptions_to_entity" add constraint "email_subscriptions_to_entity_entity_fkey" FOREIGN KEY (entity) REFERENCES entities(id) ON DELETE CASCADE not valid;

alter table "public"."email_subscriptions_to_entity" validate constraint "email_subscriptions_to_entity_entity_fkey";

alter table "public"."email_subscriptions_to_entity" add constraint "email_subscriptions_to_entity_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) ON DELETE CASCADE not valid;

alter table "public"."email_subscriptions_to_entity" validate constraint "email_subscriptions_to_entity_token_fkey";

grant delete on table "public"."email_subscriptions_to_entity" to "anon";

grant insert on table "public"."email_subscriptions_to_entity" to "anon";

grant references on table "public"."email_subscriptions_to_entity" to "anon";

grant select on table "public"."email_subscriptions_to_entity" to "anon";

grant trigger on table "public"."email_subscriptions_to_entity" to "anon";

grant truncate on table "public"."email_subscriptions_to_entity" to "anon";

grant update on table "public"."email_subscriptions_to_entity" to "anon";

grant delete on table "public"."email_subscriptions_to_entity" to "authenticated";

grant insert on table "public"."email_subscriptions_to_entity" to "authenticated";

grant references on table "public"."email_subscriptions_to_entity" to "authenticated";

grant select on table "public"."email_subscriptions_to_entity" to "authenticated";

grant trigger on table "public"."email_subscriptions_to_entity" to "authenticated";

grant truncate on table "public"."email_subscriptions_to_entity" to "authenticated";

grant update on table "public"."email_subscriptions_to_entity" to "authenticated";

grant delete on table "public"."email_subscriptions_to_entity" to "service_role";

grant insert on table "public"."email_subscriptions_to_entity" to "service_role";

grant references on table "public"."email_subscriptions_to_entity" to "service_role";

grant select on table "public"."email_subscriptions_to_entity" to "service_role";

grant trigger on table "public"."email_subscriptions_to_entity" to "service_role";

grant truncate on table "public"."email_subscriptions_to_entity" to "service_role";

grant update on table "public"."email_subscriptions_to_entity" to "service_role";
