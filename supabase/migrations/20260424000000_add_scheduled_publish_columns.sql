-- Scheduled posts: store the scheduled publish time + a snapshot of share state
-- captured at scheduling, so the Inngest job can publish without the user's session.

alter table "public"."leaflets_in_publications"
  add column "scheduled_publish_at" timestamptz,
  add column "scheduled_publish_data" jsonb;

alter table "public"."leaflets_to_documents"
  add column "scheduled_publish_at" timestamptz,
  add column "scheduled_publish_data" jsonb;
