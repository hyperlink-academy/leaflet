create table "public"."bsky_posts" (
    "uri" text not null,
    "indexed_at" timestamp with time zone not null default now(),
    "post_view" jsonb not null,
    "cid" text not null
);


alter table "public"."bsky_posts" enable row level security;

create table "public"."document_mentions_in_bsky" (
    "uri" text not null,
    "link" text not null,
    "document" text not null
);


alter table "public"."document_mentions_in_bsky" enable row level security;

alter table "public"."custom_domains" add column "identity_id" uuid;

CREATE UNIQUE INDEX bsky_posts_pkey ON public.bsky_posts USING btree (uri);

CREATE UNIQUE INDEX document_mentions_in_bsky_pkey ON public.document_mentions_in_bsky USING btree (uri, document);

alter table "public"."bsky_posts" add constraint "bsky_posts_pkey" PRIMARY KEY using index "bsky_posts_pkey";

alter table "public"."document_mentions_in_bsky" add constraint "document_mentions_in_bsky_pkey" PRIMARY KEY using index "document_mentions_in_bsky_pkey";

alter table "public"."custom_domains" add constraint "custom_domains_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE not valid;

alter table "public"."custom_domains" validate constraint "custom_domains_identity_id_fkey";

alter table "public"."document_mentions_in_bsky" add constraint "document_mentions_in_bsky_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON DELETE CASCADE not valid;

alter table "public"."document_mentions_in_bsky" validate constraint "document_mentions_in_bsky_document_fkey";

alter table "public"."document_mentions_in_bsky" add constraint "document_mentions_in_bsky_uri_fkey" FOREIGN KEY (uri) REFERENCES bsky_posts(uri) ON DELETE CASCADE not valid;

alter table "public"."document_mentions_in_bsky" validate constraint "document_mentions_in_bsky_uri_fkey";

grant delete on table "public"."bsky_posts" to "anon";

grant insert on table "public"."bsky_posts" to "anon";

grant references on table "public"."bsky_posts" to "anon";

grant select on table "public"."bsky_posts" to "anon";

grant trigger on table "public"."bsky_posts" to "anon";

grant truncate on table "public"."bsky_posts" to "anon";

grant update on table "public"."bsky_posts" to "anon";

grant delete on table "public"."bsky_posts" to "authenticated";

grant insert on table "public"."bsky_posts" to "authenticated";

grant references on table "public"."bsky_posts" to "authenticated";

grant select on table "public"."bsky_posts" to "authenticated";

grant trigger on table "public"."bsky_posts" to "authenticated";

grant truncate on table "public"."bsky_posts" to "authenticated";

grant update on table "public"."bsky_posts" to "authenticated";

grant delete on table "public"."bsky_posts" to "service_role";

grant insert on table "public"."bsky_posts" to "service_role";

grant references on table "public"."bsky_posts" to "service_role";

grant select on table "public"."bsky_posts" to "service_role";

grant trigger on table "public"."bsky_posts" to "service_role";

grant truncate on table "public"."bsky_posts" to "service_role";

grant update on table "public"."bsky_posts" to "service_role";

grant delete on table "public"."document_mentions_in_bsky" to "anon";

grant insert on table "public"."document_mentions_in_bsky" to "anon";

grant references on table "public"."document_mentions_in_bsky" to "anon";

grant select on table "public"."document_mentions_in_bsky" to "anon";

grant trigger on table "public"."document_mentions_in_bsky" to "anon";

grant truncate on table "public"."document_mentions_in_bsky" to "anon";

grant update on table "public"."document_mentions_in_bsky" to "anon";

grant delete on table "public"."document_mentions_in_bsky" to "authenticated";

grant insert on table "public"."document_mentions_in_bsky" to "authenticated";

grant references on table "public"."document_mentions_in_bsky" to "authenticated";

grant select on table "public"."document_mentions_in_bsky" to "authenticated";

grant trigger on table "public"."document_mentions_in_bsky" to "authenticated";

grant truncate on table "public"."document_mentions_in_bsky" to "authenticated";

grant update on table "public"."document_mentions_in_bsky" to "authenticated";

grant delete on table "public"."document_mentions_in_bsky" to "service_role";

grant insert on table "public"."document_mentions_in_bsky" to "service_role";

grant references on table "public"."document_mentions_in_bsky" to "service_role";

grant select on table "public"."document_mentions_in_bsky" to "service_role";

grant trigger on table "public"."document_mentions_in_bsky" to "service_role";

grant truncate on table "public"."document_mentions_in_bsky" to "service_role";

grant update on table "public"."document_mentions_in_bsky" to "service_role";
