-- Add sort_date computed column to documents table
-- This column stores the older of publishedAt (from JSON data) or indexed_at
-- Used for sorting feeds chronologically by when content was actually published

-- Note: We use ::timestamp AT TIME ZONE 'UTC' to make the expression immutable
-- (direct ::timestamptz cast is not immutable as it depends on session timezone)
ALTER TABLE documents
ADD COLUMN sort_date timestamptz GENERATED ALWAYS AS (
  LEAST(
    COALESCE((data->>'publishedAt')::timestamp AT TIME ZONE 'UTC', indexed_at),
    indexed_at
  )
) STORED;

-- Create index on sort_date for efficient ordering
CREATE INDEX documents_sort_date_idx ON documents (sort_date DESC, uri DESC);
