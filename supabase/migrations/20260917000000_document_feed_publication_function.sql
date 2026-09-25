-- Newest-N feed queries filter by publication (documents_in_publications)
-- but sort by documents.sort_date, so no index can serve "newest posts in
-- this publication": the planner either walks documents_sort_date_idx
-- probing membership per document (a full scan for readers whose
-- publications have few posts) or starts from the membership rows and
-- detoasts every document's data jsonb (seconds for publications holding
-- tens of thousands of third-party documents that have no bsky post).
--
-- The appview derives a document's publication purely from its record: the
-- site (site.standard) or publication (pub.leaflet) field, accepted only
-- when it lives in the document's own repo. Reproducing that rule as an
-- immutable function lets documents carry a (publication, sort_date) index
-- of its own — see documents_feed_idx in the next migration. If the appview
-- rule changes, change this function and REINDEX documents_feed_idx.
--
-- The subquery keeps the planner from inlining the function, so the index
-- expression and the queries' expression always match.
CREATE OR REPLACE FUNCTION document_feed_publication(doc_uri text, doc_data jsonb)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN starts_with(s.publication, 'at://' || split_part(doc_uri, '/', 3) || '/')
    THEN s.publication
  END
  FROM (
    SELECT coalesce(doc_data->>'site', doc_data->>'publication') AS publication
  ) s
$$;

CREATE INDEX IF NOT EXISTS publication_subscriptions_identity_idx
  ON public.publication_subscriptions (identity);
