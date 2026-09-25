-- The blob GC job's live-reference check: image facts bake the storage
-- object's full public URL into data->>'src' (sometimes with a cache-busting
-- query string), so index the derived object name (last path segment) of
-- every image-typed fact. Lets "is this queued blob still referenced by any
-- live fact?" be an index probe instead of a facts scan.
--
-- CONCURRENTLY avoids blocking the push path during the build, but the
-- supabase CLI applies a migration file's statements as one pipeline (an
-- implicit transaction), so it must be the ONLY statement in this file
-- (supabase/cli#2898). If a concurrent build ever fails it leaves an INVALID
-- index that IF NOT EXISTS will not rebuild — drop it manually before
-- re-running.
CREATE INDEX CONCURRENTLY IF NOT EXISTS facts_image_src_object_idx
    ON public.facts (split_part(split_part(data->>'src', '?', 1), '/', -1))
    WHERE ((data->>'type') = 'image');
