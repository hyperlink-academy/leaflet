create table "public"."publication_subscriptions" (
    "publication" text not null,
    "identity" text not null,
    "created_at" timestamp with time zone not null default now(),
    "record" jsonb not null,
    "uri" text
);


alter table "public"."publication_subscriptions" enable row level security;

CREATE UNIQUE INDEX publication_subscriptions_pkey ON public.publication_subscriptions USING btree (publication, identity);

CREATE UNIQUE INDEX publication_subscriptions_uri_key ON public.publication_subscriptions USING btree (uri);

alter table "public"."publication_subscriptions" add constraint "publication_subscriptions_pkey" PRIMARY KEY using index "publication_subscriptions_pkey";

alter table "public"."publication_subscriptions" add constraint "publication_subscriptions_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;

alter table "public"."publication_subscriptions" validate constraint "publication_subscriptions_publication_fkey";

alter table "public"."publication_subscriptions" add constraint "publication_subscriptions_uri_key" UNIQUE using index "publication_subscriptions_uri_key";

grant delete on table "public"."publication_subscriptions" to "anon";

grant insert on table "public"."publication_subscriptions" to "anon";

grant references on table "public"."publication_subscriptions" to "anon";

grant select on table "public"."publication_subscriptions" to "anon";

grant trigger on table "public"."publication_subscriptions" to "anon";

grant truncate on table "public"."publication_subscriptions" to "anon";

grant update on table "public"."publication_subscriptions" to "anon";

grant delete on table "public"."publication_subscriptions" to "authenticated";

grant insert on table "public"."publication_subscriptions" to "authenticated";

grant references on table "public"."publication_subscriptions" to "authenticated";

grant select on table "public"."publication_subscriptions" to "authenticated";

grant trigger on table "public"."publication_subscriptions" to "authenticated";

grant truncate on table "public"."publication_subscriptions" to "authenticated";

grant update on table "public"."publication_subscriptions" to "authenticated";

grant delete on table "public"."publication_subscriptions" to "service_role";

grant insert on table "public"."publication_subscriptions" to "service_role";

grant references on table "public"."publication_subscriptions" to "service_role";

grant select on table "public"."publication_subscriptions" to "service_role";

grant trigger on table "public"."publication_subscriptions" to "service_role";

grant truncate on table "public"."publication_subscriptions" to "service_role";

grant update on table "public"."publication_subscriptions" to "service_role";
