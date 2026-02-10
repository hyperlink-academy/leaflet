-- Make sort_date NOT NULL
-- The computed expression can never produce NULL because:
-- 1. indexed_at is NOT NULL
-- 2. COALESCE(parse_iso_timestamp(data->>'publishedAt'), indexed_at) always returns indexed_at as fallback
-- 3. LEAST of two non-null values is non-null

ALTER TABLE documents ALTER COLUMN sort_date SET NOT NULL;
