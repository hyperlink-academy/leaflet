// Route names whose `makeRoute` definition sets `cache` (GET-capable).
// Kept as a standalone Set, not derived from the Routes array, so the
// browser client can know which routes to GET without importing the route
// handlers themselves (supabase, redis, constellation, ...). The router
// asserts this stays in sync with the actual `cache` flags at startup.
export const CACHEABLE_ROUTES = new Set<string>([
  "get_profiles",
  "get_standard_site_posts",
  "get_standard_site_publications",
  "get_document_recommends",
  "get_publication_recommendations",
  "get_document_interactions",
  "search_publication_names",
]);
