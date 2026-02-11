ALTER TABLE documents ADD COLUMN indexed boolean NOT NULL DEFAULT true;

CREATE INDEX idx_documents_ranking
ON documents (sort_date DESC)
INCLUDE (uri, bsky_like_count, recommend_count)
WHERE indexed = true;
