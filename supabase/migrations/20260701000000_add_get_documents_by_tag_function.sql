-- The tag page fetched documents with a PostgREST filter that sorts documents by
-- sort_date and joins on the tag. With ORDER BY sort_date DESC LIMIT 50 plus a
-- selective tag filter, the planner walks the sort_date index probing for tag
-- matches; for a rare tag that scans most of the documents table before filling
-- 50 rows and blows past the statement timeout (error 57014).
--
-- Drive the query from document_tags instead (indexed on tag) so only the tagged
-- rows are joined and sorted, mirroring the get_reader_feed / get_profile_posts
-- functions. Tags in document_tags are lowercased, so callers pass a lowercased
-- tag.

CREATE OR REPLACE FUNCTION get_documents_by_tag(
  p_tag text,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  uri text,
  data jsonb,
  sort_date timestamptz,
  comments_count bigint,
  mentions_count bigint,
  recommends_count bigint,
  publication_uri text,
  publication_record jsonb,
  publication_name text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.uri,
    d.data,
    d.sort_date,
    (SELECT count(*) FROM comments_on_documents c WHERE c.document = d.uri),
    (SELECT count(*) FROM document_mentions_in_bsky m WHERE m.document = d.uri),
    (SELECT count(*) FROM recommends_on_documents r WHERE r.document = d.uri),
    pub.uri,
    pub.record,
    pub.name
  FROM document_tags dt
  JOIN documents d ON d.uri = dt.uri
  -- Inner join: the tag page only lists documents that belong to a publication.
  JOIN LATERAL (
    SELECT p.uri, p.record, p.name
    FROM documents_in_publications dip
    JOIN publications p ON p.uri = dip.publication
    WHERE dip.document = d.uri
    LIMIT 1
  ) pub ON true
  WHERE dt.tag = p_tag
    AND d.sort_date IS NOT NULL
  ORDER BY d.sort_date DESC, d.uri DESC
  LIMIT p_limit;
$$;
