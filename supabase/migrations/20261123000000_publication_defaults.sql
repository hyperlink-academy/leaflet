-- Editor choices remembered per publication so the next one starts from them
-- (e.g. a new content gate copies the last published gate's options). Shape is
-- fixed by PublicationDefaults in src/publicationDefaults.ts.
alter table "public"."publications"
  add column "defaults" jsonb not null default '{}'::jsonb;
