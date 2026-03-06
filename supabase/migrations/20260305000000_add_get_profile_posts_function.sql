CREATE OR REPLACE FUNCTION get_profile_posts(
  p_did text,
  p_cursor_sort_date timestamptz DEFAULT NULL,
  p_cursor_uri text DEFAULT NULL,
  p_limit int DEFAULT 20
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
  FROM documents d
  LEFT JOIN LATERAL (
    SELECT p.uri, p.record, p.name
    FROM documents_in_publications dip
    JOIN publications p ON p.uri = dip.publication
    WHERE dip.document = d.uri
    LIMIT 1
  ) pub ON true
  WHERE d.uri LIKE 'at://' || p_did || '/%'
    AND (
      p_cursor_sort_date IS NULL
      OR d.sort_date < p_cursor_sort_date
      OR (d.sort_date = p_cursor_sort_date AND d.uri < p_cursor_uri)
    )
  ORDER BY d.sort_date DESC, d.uri DESC
  LIMIT p_limit;
$$;
