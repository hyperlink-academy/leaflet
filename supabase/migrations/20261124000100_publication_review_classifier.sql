-- The automated spam verdict for a queued publication, written by the
-- review_publication job. A row the job cleared or flagged on its own has
-- reviewed_at set and reviewed_by null.
alter table "public"."publication_reviews"
    add column "classifier_verdict" text,
    add column "classifier_category" text,
    add column "classifier_reason" text,
    add column "classified_at" timestamp with time zone;

alter table "public"."publication_reviews"
    add constraint "publication_reviews_classifier_verdict_check"
    check (classifier_verdict in ('spam', 'legit', 'unsure'));
