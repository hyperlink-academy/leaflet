-- Add sort_date computed column to documents table
-- This column stores the older of publishedAt (from JSON data) or indexed_at
-- Used for sorting feeds chronologically by when content was actually published

-- Create an immutable function to parse ISO 8601 timestamps from text
-- This is needed because direct ::timestamp cast is not immutable (accepts 'now', 'today', etc.)
-- The regex validates the format before casting to ensure immutability
CREATE OR REPLACE FUNCTION parse_iso_timestamp(text) RETURNS timestamptz
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE
    -- Match ISO 8601 format: YYYY-MM-DDTHH:MM:SS with optional fractional seconds and Z/timezone
    WHEN $1 ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$' THEN
      $1::timestamptz
    ELSE
      NULL
  END
$$;

ALTER TABLE documents
ADD COLUMN sort_date timestamptz GENERATED ALWAYS AS (
  LEAST(
    COALESCE(parse_iso_timestamp(data->>'publishedAt'), indexed_at),
    indexed_at
  )
) STORED;

-- Create index on sort_date for efficient ordering
CREATE INDEX documents_sort_date_idx ON documents (sort_date DESC, uri DESC);
