-- Bluesky feed skeletons (feeds/index.ts). Each takes the newest p_limit
-- posts of every publication the viewer reads straight off documents_feed_idx
-- and merges them, so the work is bounded by publications × p_limit however
-- many documents those publications hold and however quiet they are.
--
-- documents_in_publications stays the authority on membership: the index
-- only finds candidates, and the membership subquery drops documents whose
-- record names a publication the appview never linked them to. It is a
-- scalar subquery rather than EXISTS because the planner pulls EXISTS up
-- into a join that reads the publication's whole membership; a scalar
-- subquery stays a primary-key probe per candidate row.
--
-- The cursor is a single row comparison with an 'infinity' default, not
-- "p_cursor IS NULL OR ...", so it becomes a bound on the index scan.

CREATE OR REPLACE FUNCTION get_subscription_feed_skeleton(
  p_identity text,
  p_cursor_timestamp timestamptz DEFAULT NULL,
  p_cursor_uri text DEFAULT NULL,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  uri text,
  sort_date timestamptz,
  post_ref jsonb,
  bsky_post_ref jsonb,
  published_at text
)
LANGUAGE sql STABLE
AS $$
  SELECT f.uri, f.sort_date, f.post_ref, f.bsky_post_ref, f.published_at
  FROM publication_subscriptions ps
  CROSS JOIN LATERAL (
    SELECT d.uri, d.sort_date,
           d.data->'postRef' AS post_ref,
           d.data->'bskyPostRef' AS bsky_post_ref,
           d.data->>'publishedAt' AS published_at
    FROM documents d
    WHERE document_feed_publication(d.uri, d.data) = ps.publication
      AND d.indexed AND (d.data->'postRef' IS NOT NULL OR d.data->'bskyPostRef' IS NOT NULL)
      AND (d.sort_date, d.uri) < (coalesce(p_cursor_timestamp, 'infinity'), coalesce(p_cursor_uri, ''))
      AND (
        SELECT true FROM documents_in_publications dip
        WHERE dip.publication = ps.publication AND dip.document = d.uri
      )
    ORDER BY d.sort_date DESC, d.uri DESC
    LIMIT p_limit
  ) f
  WHERE ps.identity = p_identity
  ORDER BY f.sort_date DESC, f.uri DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_follows_feed_skeleton(
  p_identity text,
  p_cursor_timestamp timestamptz DEFAULT NULL,
  p_cursor_uri text DEFAULT NULL,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  uri text,
  sort_date timestamptz,
  post_ref jsonb,
  bsky_post_ref jsonb,
  published_at text
)
LANGUAGE sql STABLE
AS $$
  SELECT f.uri, f.sort_date, f.post_ref, f.bsky_post_ref, f.published_at
  FROM bsky_follows bf
  JOIN publications p ON p.identity_did = bf.follows
  CROSS JOIN LATERAL (
    SELECT d.uri, d.sort_date,
           d.data->'postRef' AS post_ref,
           d.data->'bskyPostRef' AS bsky_post_ref,
           d.data->>'publishedAt' AS published_at
    FROM documents d
    WHERE document_feed_publication(d.uri, d.data) = p.uri
      AND d.indexed AND (d.data->'postRef' IS NOT NULL OR d.data->'bskyPostRef' IS NOT NULL)
      AND (d.sort_date, d.uri) < (coalesce(p_cursor_timestamp, 'infinity'), coalesce(p_cursor_uri, ''))
      AND (
        SELECT true FROM documents_in_publications dip
        WHERE dip.publication = p.uri AND dip.document = d.uri
      )
    ORDER BY d.sort_date DESC, d.uri DESC
    LIMIT p_limit
  ) f
  WHERE bf.identity = p_identity
  ORDER BY f.sort_date DESC, f.uri DESC
  LIMIT p_limit;
$$;
