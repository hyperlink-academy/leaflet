-- Walk every root in one recursive query. Calling get_facts_with_depth once per
-- root through a LATERAL join cost ~20 ms per root, serially, on the home page's
-- render path.
CREATE OR REPLACE FUNCTION public.get_facts_for_roots(roots uuid[], max_depth integer)
 RETURNS TABLE(root_id uuid, id uuid, entity uuid, attribute text, data jsonb, created_at timestamp without time zone, updated_at timestamp without time zone, version bigint, author_did text)
 LANGUAGE sql
AS $function$
  WITH RECURSIVE all_facts AS (
    SELECT r.root_id, f.*, 0 AS depth
    FROM unnest(roots) AS r(root_id)
    JOIN facts f ON f.entity = r.root_id
    UNION
    SELECT a.root_id, f.*, a.depth + 1
    FROM all_facts a
    JOIN facts f ON f.entity = uuid(a.data ->> 'value')
    WHERE a.data ->> 'type' IN ('reference', 'ordered-reference', 'spatial-reference')
      AND a.depth < max_depth
  )
  SELECT root_id, id, entity, attribute, data, created_at, updated_at, version, author_did
  FROM all_facts;
$function$;
