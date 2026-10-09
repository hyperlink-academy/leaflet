-- A draft started from another post's reply block: the at-uri of the post it
-- answers. On first publish the reply record is created for it. Plain text
-- rather than a foreign key so the existing `documents` embed under this table
-- stays unambiguous.
alter table "public"."leaflets_in_publications"
  add column "reply_to" text;
