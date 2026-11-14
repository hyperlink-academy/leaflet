-- One row per comment the subject's author hid, exploded from their
-- pub.leaflet.interactions.commentVisibility record (`uri`). `comment` carries
-- no foreign key so an entry survives the comment being indexed after it.
create table "public"."document_comment_visibility" (
    "uri" text not null,
    "subject" text not null,
    "comment" text not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_comment_visibility" enable row level security;

CREATE UNIQUE INDEX document_comment_visibility_pkey ON public.document_comment_visibility USING btree (subject, comment);

alter table "public"."document_comment_visibility" add constraint "document_comment_visibility_pkey" PRIMARY KEY using index "document_comment_visibility_pkey";

CREATE INDEX document_comment_visibility_uri_idx ON public.document_comment_visibility USING btree (uri);

alter table "public"."document_comment_visibility" add constraint "document_comment_visibility_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."document_comment_visibility" to "anon";
grant all on table "public"."document_comment_visibility" to "authenticated";
grant all on table "public"."document_comment_visibility" to "service_role";

-- A hidden comment leaves comments_on_documents, like a deleted one, so every
-- count (embedded `(count)` selects and the feed/profile SQL functions)
-- excludes it with no per-query filtering. The whole row is kept so restoring
-- puts it back as it was.
create table "public"."hidden_comments" (
    "uri" text not null,
    "document" text,
    "record" jsonb not null,
    "profile" text,
    "indexed_at" timestamp with time zone not null default now(),
    "past_versions" jsonb not null default '[]'::jsonb
);

alter table "public"."hidden_comments" enable row level security;

CREATE UNIQUE INDEX hidden_comments_pkey ON public.hidden_comments USING btree (uri);
CREATE INDEX hidden_comments_document_idx ON public.hidden_comments USING btree (document);

alter table "public"."hidden_comments" add constraint "hidden_comments_pkey" PRIMARY KEY using index "hidden_comments_pkey";

alter table "public"."hidden_comments" add constraint "hidden_comments_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."hidden_comments" to "anon";
grant all on table "public"."hidden_comments" to "authenticated";
grant all on table "public"."hidden_comments" to "service_role";

-- Moves a document's comments between comments_on_documents and
-- hidden_comments to match document_comment_visibility. Run after either
-- side changes: the visibility rows, or a comment indexed after it was hidden.
CREATE OR REPLACE FUNCTION public.sync_hidden_comments(doc text)
 RETURNS void
 LANGUAGE sql
AS $function$
  with moved as (
    delete from comments_on_documents c
    using document_comment_visibility v
    where c.document = doc and v.subject = doc and v.comment = c.uri
    returning c.uri, c.document, c.record, c.profile, c.indexed_at, c.past_versions
  )
  insert into hidden_comments (uri, document, record, profile, indexed_at, past_versions)
  select uri, document, record, profile, indexed_at, past_versions from moved
  on conflict (uri) do update set record = excluded.record;

  with restored as (
    delete from hidden_comments h
    where h.document = doc
      and not exists (
        select 1 from document_comment_visibility v
        where v.subject = doc and v.comment = h.uri
      )
    returning h.uri, h.document, h.record, h.profile, h.indexed_at, h.past_versions
  )
  insert into comments_on_documents (uri, document, record, profile, indexed_at, past_versions)
  select uri, document, record, profile, indexed_at, past_versions from restored
  on conflict (uri) do nothing;
$function$;
