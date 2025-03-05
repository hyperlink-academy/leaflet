create type "public"."pull_result" as ("client_groups" json, "facts" json);
CREATE OR REPLACE FUNCTION public.pull_data(token_id uuid, client_group_id text)
 RETURNS pull_result
 LANGUAGE plpgsql
AS $function$
DECLARE
    result pull_result;
BEGIN
    -- Get client group data as JSON array
    SELECT json_agg(row_to_json(rc))
    FROM replicache_clients rc
    WHERE rc.client_group = client_group_id
    INTO result.client_groups;

    -- Get facts as JSON array
    SELECT json_agg(row_to_json(f))
    FROM permission_tokens pt,
         get_facts(pt.root_entity) f
    WHERE pt.id = token_id
    INTO result.facts;

    RETURN result;
END;
$function$
;
