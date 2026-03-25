CREATE OR REPLACE FUNCTION public.get_leaflet_page_data(p_token_id uuid)
RETURNS TABLE (
  permission_token json,
  permission_token_rights json,
  leaflets_in_publications json,
  leaflets_to_documents json,
  custom_domain_routes json,
  facts json
)
LANGUAGE sql STABLE
AS $$
WITH token AS (
  SELECT pt.*
  FROM permission_tokens pt
  WHERE pt.id = p_token_id
),
token_rights AS (
  SELECT json_agg(row_to_json(ptr)) AS rights, array_agg(ptr.entity_set) AS entity_sets
  FROM permission_token_rights ptr
  WHERE ptr.token = p_token_id
),
related_tokens AS (
  SELECT array_agg(pt2.id) AS ids
  FROM permission_token_rights ptr2
  JOIN permission_tokens pt2 ON pt2.id = ptr2.token
  WHERE ptr2.entity_set IN (SELECT unnest(entity_sets) FROM token_rights)
    AND pt2.id != p_token_id
),
lip_direct AS (
  SELECT json_agg(row_to_json(sub)) AS data
  FROM (
    SELECT lip.*,
      row_to_json(pub) AS publications,
      row_to_json(d) AS documents
    FROM leaflets_in_publications lip
    LEFT JOIN publications pub ON pub.uri = lip.publication
    LEFT JOIN documents d ON d.uri = lip.doc
    WHERE lip.leaflet = p_token_id
  ) sub
),
lip_fallback AS (
  SELECT json_agg(row_to_json(sub)) AS data
  FROM (
    SELECT lip.*,
      row_to_json(pub) AS publications,
      row_to_json(d) AS documents
    FROM leaflets_in_publications lip
    LEFT JOIN publications pub ON pub.uri = lip.publication
    LEFT JOIN documents d ON d.uri = lip.doc
    WHERE lip.leaflet IN (SELECT unnest(ids) FROM related_tokens)
  ) sub
),
ltd_direct AS (
  SELECT json_agg(row_to_json(sub)) AS data
  FROM (
    SELECT ltd.*,
      row_to_json(doc) AS documents
    FROM leaflets_to_documents ltd
    LEFT JOIN documents doc ON doc.uri = ltd.document
    WHERE ltd.leaflet = p_token_id
  ) sub
),
ltd_fallback AS (
  SELECT json_agg(row_to_json(sub)) AS data
  FROM (
    SELECT ltd.*,
      row_to_json(doc) AS documents
    FROM leaflets_to_documents ltd
    LEFT JOIN documents doc ON doc.uri = ltd.document
    WHERE ltd.leaflet IN (SELECT unnest(ids) FROM related_tokens)
  ) sub
),
cdr AS (
  SELECT json_agg(row_to_json(c)) AS data
  FROM custom_domain_routes c
  WHERE c.edit_permission_token = p_token_id
),
facts AS (
  SELECT json_agg(row_to_json(f)) AS data
  FROM get_facts((SELECT root_entity FROM token)) f
)
SELECT
  row_to_json(token) AS permission_token,
  (SELECT rights FROM token_rights) AS permission_token_rights,
  COALESCE((SELECT data FROM lip_direct), (SELECT data FROM lip_fallback)) AS leaflets_in_publications,
  COALESCE((SELECT data FROM ltd_direct), (SELECT data FROM ltd_fallback)) AS leaflets_to_documents,
  (SELECT data FROM cdr) AS custom_domain_routes,
  (SELECT data FROM facts) AS facts
FROM token;
$$;

-- Indexes for get_leaflet_page_data query patterns
CREATE INDEX IF NOT EXISTS leaflets_in_publications_leaflet_idx
  ON public.leaflets_in_publications(leaflet);

CREATE INDEX IF NOT EXISTS permission_token_rights_entity_set_idx
  ON public.permission_token_rights(entity_set);

CREATE INDEX IF NOT EXISTS custom_domain_routes_edit_permission_token_idx
  ON public.custom_domain_routes(edit_permission_token);
