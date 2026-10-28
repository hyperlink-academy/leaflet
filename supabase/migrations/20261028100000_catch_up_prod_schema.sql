-- Objects that exist in production but that no migration creates (they were
-- made from the dashboard or by hand). Without them a database built from
-- migrations plans and types differently from prod. Found with
-- scripts/schema-drift (see REPORT-2026-10-28.md).
--
-- Every statement checks the catalog before acting, so on production (which
-- already has all of it) this takes no table locks and changes nothing.

-- documents.identity_did: stored generated column backing the profile-posts
-- index; get_profile_posts filters on it.
do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.documents'::regclass and attname = 'identity_did' and not attisdropped
  ) then
    alter table public.documents
      add column identity_did text generated always as (split_part(uri, '/'::text, 3)) stored;
  end if;

  -- Migrations built this index on the split_part expression; prod has it on
  -- the column.
  if to_regclass('public.documents_identity_did_sort_idx') is not null
     and pg_get_indexdef('public.documents_identity_did_sort_idx'::regclass) like '%split_part%' then
    drop index public.documents_identity_did_sort_idx;
  end if;
  if to_regclass('public.documents_identity_did_sort_idx') is null then
    create index documents_identity_did_sort_idx
      on public.documents using btree (identity_did, sort_date desc, uri desc);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_proc
    where oid = to_regprocedure('public.get_profile_posts(text, timestamptz, text, integer)')
      and prosrc like '%split_part(d.uri%'
  ) then
    create or replace function public.get_profile_posts(
      p_did text,
      p_cursor_sort_date timestamp with time zone default null::timestamp with time zone,
      p_cursor_uri text default null::text,
      p_limit integer default 20
    )
    returns table(uri text, data jsonb, sort_date timestamp with time zone, comments_count bigint,
                  mentions_count bigint, recommends_count bigint, publication_uri text,
                  publication_record jsonb, publication_name text)
    language sql
    stable
    as $function$
      SELECT
        d.uri,
        d.data,
        d.sort_date,
        (SELECT count(*) FROM comments_on_documents c WHERE c.document = d.uri),
        (SELECT count(*) FROM document_mentions_in_bsky m WHERE m.document = d.uri),
        (SELECT count(*) FROM recommends_on_documents r WHERE r.document = d.uri),
        pub.uri,
        pub.record,
        pub.name
      FROM documents d
      LEFT JOIN LATERAL (
        SELECT p.uri, p.record, p.name
        FROM documents_in_publications dip
        JOIN publications p ON p.uri = dip.publication
        WHERE dip.document = d.uri
        LIMIT 1
      ) pub ON true
      WHERE d.identity_did = p_did
        AND (
          p_cursor_sort_date IS NULL
          OR d.sort_date < p_cursor_sort_date
          OR (d.sort_date = p_cursor_sort_date AND d.uri < p_cursor_uri)
        )
      ORDER BY d.sort_date DESC, d.uri DESC
      LIMIT p_limit;
    $function$;
  end if;
end $$;

-- Foreign-key / lookup indexes that prod has. facts_entity_idx is the big
-- one: every fact walk by entity (get_facts_with_depth, get_facts_for_roots,
-- CVR pulls) seq-scans facts without it.
do $$
declare
  ix record;
begin
  for ix in
    select * from (values
      ('facts_entity_idx', 'create index facts_entity_idx on public.facts using btree (entity)'),
      ('entities_set_idx', 'create index entities_set_idx on public.entities using btree (set)'),
      ('permission_token_rights_token_idx', 'create index permission_token_rights_token_idx on public.permission_token_rights using btree (token)'),
      ('publications_identity_did_idx', 'create index publications_identity_did_idx on public.publications using btree (identity_did)'),
      ('replicache_clients_client_group_idx', 'create index replicache_clients_client_group_idx on public.replicache_clients using btree (client_group)'),
      ('documents_in_publications_publication_idx', 'create index documents_in_publications_publication_idx on public.documents_in_publications using btree (publication)'),
      ('documents_indexed_at_idx', 'create index documents_indexed_at_idx on public.documents using btree (indexed_at)'),
      ('leaflets_in_publications_doc_idx', 'create index leaflets_in_publications_doc_idx on public.leaflets_in_publications using btree (doc)'),
      ('leaflets_in_publications_publication_idx', 'create index leaflets_in_publications_publication_idx on public.leaflets_in_publications using btree (publication)'),
      ('publication_domains_publication_idx', 'create index publication_domains_publication_idx on public.publication_domains using btree (publication)'),
      ('publication_subscriptions_publication_idx', 'create index publication_subscriptions_publication_idx on public.publication_subscriptions using btree (publication)')
    ) as t(name, ddl)
  loop
    if to_regclass('public.' || ix.name) is null then
      execute ix.ddl;
    end if;
  end loop;
end $$;

-- Leftover composite type in prod (no function returns it any more); kept so
-- generated types match.
do $$
begin
  if to_regtype('public.leaflet_page_result') is null then
    create type public.leaflet_page_result as (
      permission_token json,
      permission_token_rights json,
      leaflets_in_publications json,
      leaflets_to_documents json,
      custom_domain_routes json,
      facts json
    );
  end if;
end $$;

-- Installed in prod from the dashboard's index advisor.
create extension if not exists hypopg with schema extensions;
create extension if not exists index_advisor with schema extensions;

-- Storage: the buckets the app uploads to, and the anon upload/read policy on
-- user assets. Skipped where the storage schema isn't installed.
do $$
begin
  -- storage.buckets only has "public" once storage-api has run its migrations.
  if exists (select 1 from pg_attribute where attrelid = to_regclass('storage.buckets')
             and attname = 'public' and not attisdropped)
     and (select count(*) from storage.buckets where id in ('minilink-user-assets', 'url-previews')) < 2 then
    insert into storage.buckets (id, name, public)
    values ('minilink-user-assets', 'minilink-user-assets', true),
           ('url-previews', 'url-previews', true)
    on conflict (id) do nothing;
  end if;

  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'Allow anon users to upload and read files awglhl_0') then
      create policy "Allow anon users to upload and read files awglhl_0" on storage.objects
        as permissive for select to public
        using (((bucket_id = 'minilink-user-assets'::text) and (auth.role() = 'anon'::text)));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'Allow anon users to upload and read files awglhl_1') then
      create policy "Allow anon users to upload and read files awglhl_1" on storage.objects
        as permissive for insert to public
        with check (((bucket_id = 'minilink-user-assets'::text) and (auth.role() = 'anon'::text)));
    end if;
  end if;
end $$;
