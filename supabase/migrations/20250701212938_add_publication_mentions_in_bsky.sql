create table "public"."document_mentions_in_bsky" (
    "uri" text not null,
    "cid" text not null,
    "record" jsonb not null,
    "indexed_at" timestamp with time zone not null default now(),
    "link" text not null,
    "document" text not null
);


alter table "public"."document_mentions_in_bsky" enable row level security;

CREATE UNIQUE INDEX document_mentions_in_bsky_pkey ON public.document_mentions_in_bsky USING btree (uri);

alter table "public"."document_mentions_in_bsky" add constraint "document_mentions_in_bsky_pkey" PRIMARY KEY using index "document_mentions_in_bsky_pkey";

alter table "public"."document_mentions_in_bsky" add constraint "document_mentions_in_bsky_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON DELETE CASCADE not valid;

alter table "public"."document_mentions_in_bsky" validate constraint "document_mentions_in_bsky_document_fkey";

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
