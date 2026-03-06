CREATE OR REPLACE FUNCTION get_reader_feed(
  p_identity text,
  p_cursor_timestamp timestamptz DEFAULT NULL,
  p_cursor_uri text DEFAULT NULL,
  p_limit int DEFAULT 25
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
  JOIN documents_in_publications dip ON dip.document = d.uri
  JOIN publication_subscriptions ps ON ps.publication = dip.publication
  LEFT JOIN LATERAL (
    SELECT p.uri, p.record, p.name
    FROM documents_in_publications dip2
    JOIN publications p ON p.uri = dip2.publication
    WHERE dip2.document = d.uri
    LIMIT 1
  ) pub ON true
  WHERE ps.identity = p_identity
    AND (
      p_cursor_timestamp IS NULL
      OR d.sort_date < p_cursor_timestamp
      OR (d.sort_date = p_cursor_timestamp AND d.uri < p_cursor_uri)
    )
  GROUP BY d.uri, d.data, d.sort_date, pub.uri, pub.record, pub.name
  ORDER BY d.sort_date DESC, d.uri DESC
  LIMIT p_limit;
$$;
