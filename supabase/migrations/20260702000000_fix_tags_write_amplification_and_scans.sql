-- The document_tags optimization introduced two regressions and left one scan
-- unfixed:
--
-- 1. Write amplification: the sync trigger fires on EVERY insert/update of
--    documents.data — the firehose upserts a document's data on every event and
--    sync_document_metadata rewrites it again — and each firing did a blanket
--    DELETE + re-INSERT of that document's tag rows even when tags were
--    unchanged. That churns dead tuples through the table and both of its
--    indexes (including a GIN trigram index, which is expensive to maintain)
--    on the hottest write path in the system.
--
-- 2. search_tags('') still aggregates the ENTIRE document_tags table
--    (GROUP BY + COUNT DISTINCT + ORDER BY count) — a full scan that grows
--    with the corpus, and the trigram index cannot help 1-2 character LIKE
--    patterns, which also fall back to full scans.
--
-- 3. The tag page orders documents by sort_date with a LIMIT while joining
--    document_tags; the planner can choose to walk documents_sort_date_idx
--    and probe every document for the tag — a full scan of documents for
--    rare tags.
--
-- Fix: gate the trigger on actual tag changes and sync differentially;
-- maintain a small tag_counts rollup so tag search never aggregates; move the
-- trigram index to the rollup; and serve the tag page from a function whose
-- plan is fenced to start from the tag index.
--
-- The CI supabase CLI applies migration statements in autocommit mode (its
-- first attempt at this file half-applied and then deadlocked against the
-- firehose), so the transaction is explicit. Every statement is idempotent
-- so the file is safe to re-run over the partially applied state.
BEGIN;

SET LOCAL search_path = public, extensions;
SET LOCAL lock_timeout = '15s';

-- Take both exclusive locks up front, documents first — the same order the
-- write path locks them (a documents write fires the sync trigger, which then
-- writes document_tags). The first attempt locked document_tags first via
-- CREATE TRIGGER and then requested documents for DROP TRIGGER, forming a
-- lock-order cycle with an in-flight firehose upsert: deadlock. Acquiring in
-- write-path order just waits for in-flight writers instead of deadlocking,
-- and lock_timeout bounds the wait (on timeout everything rolls back and the
-- deploy can be re-run).
LOCK TABLE "public"."documents", "public"."document_tags" IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------------
-- Tag count rollup: one row per distinct tag, maintained by trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."tag_counts" (
    "tag" text NOT NULL PRIMARY KEY,
    "document_count" bigint NOT NULL DEFAULT 0
);
ALTER TABLE "public"."tag_counts" ENABLE ROW LEVEL SECURITY;

-- Serves the top-tags query (empty search) as a bounded index scan.
CREATE INDEX IF NOT EXISTS idx_tag_counts_count
    ON "public"."tag_counts" (document_count DESC, tag ASC);
-- Substring search now runs against distinct tags instead of every
-- (document, tag) pair; the trigram index keeps it index-assisted.
CREATE INDEX IF NOT EXISTS idx_tag_counts_tag_trgm
    ON "public"."tag_counts" USING gin (tag gin_trgm_ops);

CREATE OR REPLACE FUNCTION sync_tag_counts()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "public"."tag_counts" (tag, document_count)
        VALUES (NEW.tag, 1)
        ON CONFLICT (tag)
        DO UPDATE SET document_count = tag_counts.document_count + 1;
        RETURN NEW;
    ELSE
        UPDATE "public"."tag_counts"
        SET document_count = document_count - 1
        WHERE tag = OLD.tag;
        DELETE FROM "public"."tag_counts"
        WHERE tag = OLD.tag AND document_count <= 0;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The exclusive lock held on document_tags means the backfill below sees a
-- consistent snapshot: rows written after this migration commits go through
-- the trigger, rows before it are aggregated.
DROP TRIGGER IF EXISTS document_tags_sync_counts ON "public"."document_tags";
CREATE TRIGGER document_tags_sync_counts
    AFTER INSERT OR DELETE ON "public"."document_tags"
    FOR EACH ROW EXECUTE FUNCTION sync_tag_counts();

INSERT INTO "public"."tag_counts" (tag, document_count)
SELECT tag, COUNT(*) FROM "public"."document_tags" GROUP BY tag
ON CONFLICT (tag) DO UPDATE SET document_count = EXCLUDED.document_count;
-- On a re-run the table may hold counts from the earlier partial apply for
-- tags that have since disappeared; the insert above can't remove those.
DELETE FROM "public"."tag_counts" tc
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."document_tags" dt WHERE dt.tag = tc.tag
);

-- ---------------------------------------------------------------------------
-- Differential document_tags sync, gated on tags actually changing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_document_tags()
RETURNS trigger AS $$
BEGIN
    IF jsonb_typeof(NEW.data->'tags') = 'array' THEN
        DELETE FROM "public"."document_tags" dt
        WHERE dt.uri = NEW.uri
          AND dt.tag NOT IN (
            SELECT LOWER(t)
            FROM jsonb_array_elements_text(NEW.data->'tags') AS t
            WHERE t IS NOT NULL
          );
        INSERT INTO "public"."document_tags" (uri, tag)
        SELECT NEW.uri, LOWER(t)
        FROM jsonb_array_elements_text(NEW.data->'tags') AS t
        WHERE t IS NOT NULL
        ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM "public"."document_tags" WHERE uri = NEW.uri;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Split the old single trigger so updates only fire when the tags array
-- actually changed; unrelated data updates (blob inflation, postRef writes,
-- backfill jobs) no longer touch document_tags at all.
DROP TRIGGER IF EXISTS documents_sync_tags ON "public"."documents";
DROP TRIGGER IF EXISTS documents_sync_tags_insert ON "public"."documents";
DROP TRIGGER IF EXISTS documents_sync_tags_update ON "public"."documents";
CREATE TRIGGER documents_sync_tags_insert
    AFTER INSERT ON "public"."documents"
    FOR EACH ROW EXECUTE FUNCTION sync_document_tags();
CREATE TRIGGER documents_sync_tags_update
    AFTER UPDATE OF data ON "public"."documents"
    FOR EACH ROW
    WHEN (OLD.data->'tags' IS DISTINCT FROM NEW.data->'tags')
    EXECUTE FUNCTION sync_document_tags();

-- The trigram index on document_tags is no longer queried (search moved to
-- tag_counts); dropping it removes GIN maintenance from the write path. The
-- plain B-tree on tag stays for the tag-page equality lookups.
DROP INDEX IF EXISTS idx_document_tags_tag_trgm;

-- ---------------------------------------------------------------------------
-- search_tags: same signature, now O(matching distinct tags) with no
-- aggregation; the empty query is a LIMIT 20 index scan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_tags(search_query text)
RETURNS TABLE (name text, document_count bigint) AS $$
    SELECT tc.tag, tc.document_count
    FROM "public"."tag_counts" tc
    WHERE search_query = '' OR tc.tag LIKE '%' || search_query || '%'
    ORDER BY tc.document_count DESC, tc.tag ASC
    LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- Tag page: return the newest document uris for a tag. The MATERIALIZED CTE
-- is an optimization fence that forces the plan to start from the
-- document_tags tag index — the planner can never choose to walk
-- documents_sort_date_idx probing every document for the tag. enable_seqscan
-- is scoped to this function so the join runs as pkey probes per tagged
-- document instead of hashing the whole documents table; every index the
-- fenced plan needs exists, so nothing here can degrade to a scan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_tag_page_document_uris(tag_query text, max_count int DEFAULT 50)
RETURNS TABLE (uri text) AS $$
    WITH tag_docs AS MATERIALIZED (
        SELECT dt.uri FROM "public"."document_tags" dt WHERE dt.tag = tag_query
    )
    SELECT d.uri
    FROM "public"."documents" d
    JOIN tag_docs td ON td.uri = d.uri
    ORDER BY d.sort_date DESC NULLS LAST
    LIMIT max_count;
$$ LANGUAGE sql STABLE SET enable_seqscan = off;

-- Only the SECURITY DEFINER trigger and the service role write these tables.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."document_tags" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."tag_counts" TO "anon", "authenticated";
GRANT ALL ON TABLE "public"."tag_counts" TO "service_role";

-- tag_counts was just created and backfilled, so it has no statistics until
-- autoanalyze runs; document_tags stats predate the trigger churn. Refresh
-- both so the new plans are chosen from the first query. (VACUUM can't run
-- here — migrations execute inside a transaction — so reclaiming the bloat
-- the old trigger left in document_tags stays with autovacuum, or a one-off
-- manual `VACUUM public.document_tags` to speed it up.)
ANALYZE "public"."document_tags";
ANALYZE "public"."tag_counts";

COMMIT;
