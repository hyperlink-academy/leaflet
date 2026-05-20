-- Provenance metadata on email subscribers (e.g. csv_import, imported_at,
-- original_subscription_date). The events table already has its own
-- per-event metadata column; this one tags the subscriber row itself so
-- "where did these subscribers come from" is a one-table query.

alter table "public"."publication_email_subscribers"
  add column "metadata" jsonb;
