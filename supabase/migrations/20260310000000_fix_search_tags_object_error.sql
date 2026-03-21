-- Fix search_tags function to handle documents where data->'tags' is not a JSON array
-- This prevents "cannot extract elements from an object" errors
CREATE OR REPLACE FUNCTION search_tags(search_query text)
RETURNS TABLE (name text, document_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(tag::text) as name,
        COUNT(DISTINCT d.uri) as document_count
    FROM (
        SELECT uri, data
        FROM "public"."documents"
        WHERE jsonb_typeof(data->'tags') = 'array'
    ) d,
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
