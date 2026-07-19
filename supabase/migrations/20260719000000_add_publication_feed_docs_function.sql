-- The feed query (generateFeed) selects from documents ordered by
-- sort_date with a LIMIT while filtering through documents_in_publications.
-- Same trap as the tag page (see 20260702000000): the planner walks
-- documents_sort_date_idx and probes documents_in_publications for every
-- document until it finds 50 in the publication — a full scan of documents
-- for small or inactive publications, on a path readers poll constantly.
--
-- The MATERIALIZED CTE is an optimization fence that forces the plan to
-- start from the publication's own membership rows (the
-- documents_in_publications pkey is (publication, document)); enable_seqscan
-- is scoped to this function so the join runs as documents pkey probes
-- instead of hashing the whole documents table. Work is then bounded by the
-- publication's post count, and only the returned rows detoast their data
-- jsonb.
--
-- NULLS LAST keeps documents without a parseable date at the end (they feed
-- out as epoch 0), and keeps row 0 — which callers use for Last-Modified —
-- the newest dated post.
CREATE OR REPLACE FUNCTION get_publication_feed_docs(p_publication text, p_limit int DEFAULT 50)
RETURNS TABLE (uri text, data jsonb, sort_date timestamptz) AS $$
    WITH pub_docs AS MATERIALIZED (
        SELECT dip.document
        FROM "public"."documents_in_publications" dip
        WHERE dip.publication = p_publication
    )
    SELECT d.uri, d.data, d.sort_date
    FROM "public"."documents" d
    JOIN pub_docs pd ON pd.document = d.uri
    ORDER BY d.sort_date DESC NULLS LAST, d.uri DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE SET enable_seqscan = off;
