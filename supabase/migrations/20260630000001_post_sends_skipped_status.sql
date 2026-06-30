-- Allow a 'skipped' status on publication_post_sends. publishToPublication
-- pre-claims the send slot with this status when the author opts out of the
-- newsletter (e.g. "Post Quietly"), so the firehose-triggered broadcast path in
-- sync_document_metadata finds the slot already claimed and never sends.
alter table "public"."publication_post_sends" drop constraint "publication_post_sends_status_check";
alter table "public"."publication_post_sends" add constraint "publication_post_sends_status_check" CHECK (status IN ('pending','sending','sent','failed','skipped')) not valid;
alter table "public"."publication_post_sends" validate constraint "publication_post_sends_status_check";
