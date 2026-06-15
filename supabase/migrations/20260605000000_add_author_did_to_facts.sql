-- Add an optional DID binding to facts. A fact with author_did is
-- "authenticated" to a specific identity; write enforcement lives in the push
-- action (see cachedServerMutationContext).
alter table "public"."facts" add column "author_did" text;

-- Propagate author_did through the get_facts_for_roots / get_facts_with_depth
-- path (used by the getFactsForRoots RPC for home-page leaflet previews). These
-- functions have explicit return column lists, so the column does not flow
-- through automatically the way it does for get_facts (RETURNS SETOF facts).
-- CREATE OR REPLACE cannot change a function's return type, so drop and
-- recreate. Drop the outer function first since it calls the inner one.

set check_function_bodies = off;

DROP FUNCTION IF EXISTS public.get_facts_for_roots(uuid[], integer);
DROP FUNCTION IF EXISTS public.get_facts_with_depth(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_facts_with_depth(root uuid, max_depth integer)
 RETURNS TABLE(id uuid, entity uuid, attribute text, data jsonb, created_at timestamp without time zone, updated_at timestamp without time zone, version bigint, author_did text)
 LANGUAGE sql
AS $function$WITH RECURSIVE all_facts as (
    -- Base case: start with root level (depth 0)
    select
      *,
      0 as depth
    from
      facts
    where
      entity = root

    union

    -- Recursive case: join with previous level and increment depth
    select
      f.*,
      f1.depth + 1 as depth
    from
      facts f
      inner join all_facts f1 on (
         uuid(f1.data ->> 'value') = f.entity
      )
    where
      (f1.data ->> 'type' in ('reference', 'ordered-reference', 'spatial-reference'))
      and f1.depth < max_depth  -- Add depth limit parameter
  )
select
 id, entity, attribute, data, created_at, updated_at, version, author_did
from
  all_facts;$function$
;

CREATE OR REPLACE FUNCTION public.get_facts_for_roots(roots uuid[], max_depth integer)
 RETURNS TABLE(root_id uuid, id uuid, entity uuid, attribute text, data jsonb, created_at timestamp without time zone, updated_at timestamp without time zone, version bigint, author_did text)
 LANGUAGE sql
AS $function$
    SELECT
      root_id,
      f.*
    FROM unnest(roots) AS root_id
    CROSS JOIN LATERAL get_facts_with_depth(root_id, max_depth) f;
$function$
;
