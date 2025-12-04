-- Create GIN index on the tags array in the JSONB data field
-- This allows efficient querying of documents by tag
CREATE INDEX IF NOT EXISTS idx_documents_tags
    ON "public"."documents" USING gin ((data->'tags'));

-- Function to search and aggregate tags from documents
-- This does the aggregation in the database rather than fetching all documents
CREATE OR REPLACE FUNCTION search_tags(search_query text)
RETURNS TABLE (name text, document_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(tag::text) as name,
        COUNT(DISTINCT d.uri) as document_count
    FROM
        "public"."documents" d,
        jsonb_array_elements_text(d.data->'tags') as tag
    WHERE
        CASE
            WHEN search_query = '' THEN true
            ELSE LOWER(tag::text) LIKE '%' || search_query || '%'
        END
    GROUP BY
        LOWER(tag::text)
    ORDER BY
        COUNT(DISTINCT d.uri) DESC,
        LOWER(tag::text) ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;
