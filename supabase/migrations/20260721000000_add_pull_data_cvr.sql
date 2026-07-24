-- CVR pull query: replicates pull_data (and its get_facts closure walk) with
-- two changes for the row-version strategy. Each fact carries a row_version
-- taken from xmin, which bumps on every insert/update; and the caller's base
-- CVR fact versions come in as base_cvr, so the full fact row is only
-- serialized for facts that are new or changed against that base — everything
-- else returns as bare (id, row_version) pairs, which the caller needs to
-- build the next CVR anyway. Pass '{}' to hydrate everything (full snapshot).
-- A single SQL statement, so all reads share one snapshot: a mutation's
-- lastMutationID is never visible without its fact writes.
CREATE OR REPLACE FUNCTION public.pull_data_cvr(token_id uuid, client_group_id text, base_cvr jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
SELECT jsonb_build_object(
  'client_groups', (
    SELECT jsonb_agg(jsonb_build_object(
      'client_id', rc.client_id,
      'last_mutation', rc.last_mutation))
    FROM replicache_clients rc
    WHERE rc.client_group = client_group_id
  ),
  'facts', (
    WITH RECURSIVE all_facts AS (
        SELECT f.*, f.xmin::text::bigint AS row_version
        FROM facts f
        JOIN permission_tokens pt ON f.entity = pt.root_entity
        WHERE pt.id = token_id
      UNION
        SELECT f.*, f.xmin::text::bigint AS row_version
        FROM facts f
        INNER JOIN all_facts f1 ON (uuid(f1.data ->> 'value') = f.entity)
        WHERE f1.data ->> 'type' = 'reference'
           OR f1.data ->> 'type' = 'ordered-reference'
           OR f1.data ->> 'type' = 'spatial-reference'
    ),
    base AS (
      SELECT key AS id, value::bigint AS row_version
      FROM jsonb_each_text(coalesce(base_cvr, '{}'::jsonb))
    )
    SELECT jsonb_agg(jsonb_build_object(
      'id', af.id,
      'row_version', af.row_version,
      'fact', CASE WHEN b.row_version IS NULL OR b.row_version <> af.row_version
                   THEN row_to_json(af)::jsonb - 'row_version'
              END))
    FROM all_facts af
    LEFT JOIN base b ON b.id = af.id::text
  ),
  'publications', coalesce(
    (SELECT jsonb_agg(row_to_json(lip)::jsonb)
     FROM leaflets_in_publications lip
     WHERE lip.leaflet = token_id),
    (SELECT jsonb_agg(row_to_json(ltd)::jsonb)
     FROM leaflets_to_documents ltd
     WHERE ltd.leaflet = token_id)
  ),
  'draft_contributors', (
    SELECT jsonb_agg(lc.contributor_did)
    FROM leaflet_contributors lc
    WHERE lc.leaflet = token_id
  )
);
$function$
;
