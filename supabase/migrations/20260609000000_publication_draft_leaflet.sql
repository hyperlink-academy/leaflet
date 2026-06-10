-- Publication pages move to a single draft leaflet per publication. The draft
-- leaflet (a permission token) hangs off the publication; pages, routes,
-- titles, ordering, and external links live as facts inside it.
alter table "public"."publications"
    add column "draft_leaflet" uuid references permission_tokens(id),
    -- the in-progress draft_theme column was applied to dev databases without
    -- a migration file and never shipped; draft theme now lives as theme/*
    -- facts on the draft leaflet
    drop column if exists "draft_theme";

-- publication_pages becomes published-state only, keyed by the page's entity
-- id in the draft leaflet. Draft-only columns go away:
--  - leaflet_src: pages no longer have their own backing leaflet
--  - metadata: never used
--  - published_metadata: path/title/sort_order ARE the published snapshot now
-- (published_metadata and the nullable leaflet_src were applied to dev
--  databases without a migration file, hence the `if exists`.)
alter table "public"."publication_pages"
    add column "page_entity" uuid;

-- Publish upserts rows keyed by (publication, page_entity). Old-model rows
-- (page_entity is null) are allowed to linger until first publish deletes them.
create unique index publication_pages_publication_page_entity_idx
    on public.publication_pages (publication, page_entity);
