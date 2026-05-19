alter table "public"."publication_pages"
  add column "record" jsonb,
  add column "record_uri" text;
