-- The previous search_tags implementation scanned every row in "documents",
-- unnested data->'tags' for each one, and ran an unindexable LIKE '%query%' over
-- the result on every keystroke. As the table grew this blew past the statement
-- timeout (error 57014). Replace it with a normalized, lowercased tag table kept
-- in sync by a trigger, with a trigram index so substring search is index-backed.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "public"."document_tags" (
    "uri" text NOT NULL REFERENCES "public"."documents"(uri) ON DELETE CASCADE,
    "tag" text NOT NULL,
    PRIMARY KEY (uri, tag)
);
ALTER TABLE "public"."document_tags" ENABLE ROW LEVEL SECURITY;

-- Trigram GIN index makes LIKE '%query%' substring matching index-assisted.
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_trgm
    ON "public"."document_tags" USING gin (tag gin_trgm_ops);
-- Plain B-tree supports the GROUP BY / top-tags aggregation (empty query).
CREATE INDEX IF NOT EXISTS idx_document_tags_tag
    ON "public"."document_tags" (tag);

-- Keep document_tags in sync with documents.data->'tags'. SECURITY DEFINER so it
-- works regardless of which role writes to documents; the FK ON DELETE CASCADE
-- handles row deletions, so we only react to inserts and tag changes here.
CREATE OR REPLACE FUNCTION sync_document_tags()
RETURNS trigger AS $$
BEGIN
    DELETE FROM "public"."document_tags" WHERE uri = NEW.uri;
    IF jsonb_typeof(NEW.data->'tags') = 'array' THEN
        INSERT INTO "public"."document_tags" (uri, tag)
        SELECT NEW.uri, LOWER(tag)
        FROM jsonb_array_elements_text(NEW.data->'tags') AS tag
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS documents_sync_tags ON "public"."documents";
CREATE TRIGGER documents_sync_tags
    AFTER INSERT OR UPDATE OF data ON "public"."documents"
    FOR EACH ROW EXECUTE FUNCTION sync_document_tags();

-- Backfill from existing documents.
INSERT INTO "public"."document_tags" (uri, tag)
SELECT d.uri, LOWER(tag)
FROM "public"."documents" d,
     jsonb_array_elements_text(d.data->'tags') AS tag
WHERE jsonb_typeof(d.data->'tags') = 'array'
ON CONFLICT DO NOTHING;

-- The old GIN index on data->'tags' only supported containment lookups for the
-- previous search_tags implementation, which no longer exists. Nothing else
-- queries data->'tags' through it, so drop it.
DROP INDEX IF EXISTS idx_documents_tags;

CREATE OR REPLACE FUNCTION search_tags(search_query text)
RETURNS TABLE (name text, document_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.tag AS name,
        COUNT(DISTINCT dt.uri) AS document_count
    FROM "public"."document_tags" dt
    WHERE
        CASE
            WHEN search_query = '' THEN true
            ELSE dt.tag LIKE '%' || search_query || '%'
        END
    GROUP BY dt.tag
    ORDER BY
        COUNT(DISTINCT dt.uri) DESC,
        dt.tag ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."document_tags" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."document_tags" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."document_tags" TO "service_role";
