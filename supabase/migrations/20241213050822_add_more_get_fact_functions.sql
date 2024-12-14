CREATE OR REPLACE FUNCTION public.get_facts_with_depth(root uuid, max_depth integer)
 RETURNS TABLE("like" facts)
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
 id, entity, attribute, data, created_at, updated_at, version
from
  all_facts;$function$
;

CREATE OR REPLACE FUNCTION public.get_facts_for_roots(roots uuid[], max_depth integer)
 RETURNS TABLE(root_id uuid, id uuid, entity uuid, attribute text, data jsonb, created_at timestamp without time zone, updated_at timestamp without time zone, version bigint)
 LANGUAGE sql
AS $function$
    SELECT
      root_id,
      f.*
    FROM unnest(roots) AS root_id
    CROSS JOIN LATERAL get_facts_with_depth(root_id, max_depth) f;
$function$
;