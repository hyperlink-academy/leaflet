-- External link nav tabs are publication_pages rows that point at a full URL
-- instead of a hosted page, so they have no backing leaflet document.
alter table "public"."publication_pages" alter column "leaflet_src" drop not null;

-- Snapshot of a publication page's published nav state ({ path, title,
-- sort_order }). The row's path/title/sort_order columns are the editable draft;
-- this is what the public site reads, so draft edits don't go live until the
-- next publish writes the snapshot. Null = never published.
alter table "public"."publication_pages" add column "published_metadata" jsonb;

-- Backfill already-published pages from their current values so their nav tabs
-- keep rendering after the public read path switches to the snapshot.
update "public"."publication_pages"
set "published_metadata" = jsonb_build_object(
  'path', "path",
  'title', "title",
  'sort_order', "sort_order"
)
where "record_uri" is not null;
