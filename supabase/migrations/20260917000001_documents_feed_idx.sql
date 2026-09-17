-- Per-publication, newest-first index over the documents the Bluesky feed
-- skeletons can return (indexed, with a bsky post ref) — about 3.5% of
-- documents. The WHERE clause must stay textually identical to the one in
-- get_subscription_feed_skeleton / get_follows_feed_skeleton or the planner
-- cannot prove the partial index applies.
--
-- CONCURRENTLY avoids blocking the appview write path during the build, but
-- the supabase CLI applies a migration file's statements as one pipeline (an
-- implicit transaction), so it must be the ONLY statement in this file
-- (supabase/cli#2898). If a concurrent build ever fails it leaves an INVALID
-- index that IF NOT EXISTS will not rebuild — drop it manually before
-- re-running.
CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_feed_idx
    ON public.documents (document_feed_publication(uri, data), sort_date DESC, uri DESC)
    WHERE indexed AND (data->'postRef' IS NOT NULL OR data->'bskyPostRef' IS NOT NULL);
