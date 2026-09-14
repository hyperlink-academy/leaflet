-- A deleted comment leaves comments_on_documents entirely so every count
-- (embedded `(count)` selects and the feed/profile SQL functions) excludes it
-- with no per-query filtering. The tombstone keeps just enough of the record
-- (subject, createdAt, onPage, reply) to place a "deleted" placeholder in the
-- thread so replies to it stay reachable.
create table "public"."comment_tombstones" (
    "uri" text not null,
    "document" text,
    "record" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
);

alter table "public"."comment_tombstones" enable row level security;

CREATE UNIQUE INDEX comment_tombstones_pkey ON public.comment_tombstones USING btree (uri);
CREATE INDEX comment_tombstones_document_idx ON public.comment_tombstones USING btree (document);

alter table "public"."comment_tombstones" add constraint "comment_tombstones_pkey" PRIMARY KEY using index "comment_tombstones_pkey";

alter table "public"."comment_tombstones" add constraint "comment_tombstones_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_tombstones" validate constraint "comment_tombstones_document_fkey";

grant delete on table "public"."comment_tombstones" to "anon";
grant insert on table "public"."comment_tombstones" to "anon";
grant references on table "public"."comment_tombstones" to "anon";
grant select on table "public"."comment_tombstones" to "anon";
grant trigger on table "public"."comment_tombstones" to "anon";
grant truncate on table "public"."comment_tombstones" to "anon";
grant update on table "public"."comment_tombstones" to "anon";

grant delete on table "public"."comment_tombstones" to "authenticated";
grant insert on table "public"."comment_tombstones" to "authenticated";
grant references on table "public"."comment_tombstones" to "authenticated";
grant select on table "public"."comment_tombstones" to "authenticated";
grant trigger on table "public"."comment_tombstones" to "authenticated";
grant truncate on table "public"."comment_tombstones" to "authenticated";
grant update on table "public"."comment_tombstones" to "authenticated";

grant delete on table "public"."comment_tombstones" to "service_role";
grant insert on table "public"."comment_tombstones" to "service_role";
grant references on table "public"."comment_tombstones" to "service_role";
grant select on table "public"."comment_tombstones" to "service_role";
grant trigger on table "public"."comment_tombstones" to "service_role";
grant truncate on table "public"."comment_tombstones" to "service_role";
grant update on table "public"."comment_tombstones" to "service_role";

-- Each edit pushes the record it replaced onto this list, newest last, as
-- { record, replaced_at }. The live record stays in `record`.
alter table "public"."comments_on_documents"
  add column "past_versions" jsonb not null default '[]'::jsonb;
