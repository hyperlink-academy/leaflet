-- The notifications table only had its primary key, so the panel fetch
-- (filter by recipient, paginate newest-first) was a seq scan + sort.
--
-- CONCURRENTLY avoids blocking the notification write path during the build,
-- but the supabase CLI applies a migration file's statements as one pipeline
-- (an implicit transaction), so it must be the ONLY statement in this file
-- (supabase/cli#2898). If a concurrent build ever fails it leaves an INVALID
-- index that IF NOT EXISTS will not rebuild — drop it manually before
-- re-running.
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_recipient_created_at_id_idx
    ON "public"."notifications" (recipient, created_at DESC, id DESC);
