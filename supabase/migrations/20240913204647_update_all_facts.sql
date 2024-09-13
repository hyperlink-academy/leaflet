CREATE OR REPLACE FUNCTION public.get_facts(root uuid)
 RETURNS SETOF facts
 LANGUAGE sql
AS $function$WITH RECURSIVE all_facts as (
    select
      *
    from
      facts
    where
      entity = root
    union
    select
      f.*
    from
      facts f
      inner join all_facts f1 on (
         uuid(f1.data ->> 'value') = f.entity
      ) where f1.data ->> 'type' = 'reference' or f1.data ->> 'type' = 'ordered-reference' or f1.data ->> 'type' = 'spatial-reference'
  )
select
  *
from
  all_facts;$function$
;
