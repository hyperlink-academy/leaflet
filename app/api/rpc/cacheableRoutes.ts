// Route names whose `makeRoute` definition sets `cache` (GET-capable).
// Kept as a standalone Set, not derived from the Routes array, so the
// browser client can know which routes to GET without importing the route
// handlers themselves (supabase, redis, constellation, ...). The router
// asserts this stays in sync with the actual `cache` flags at startup.
//
// Recommends and document interactions are deliberately absent: a viewer can
// write both, and a shared edge entry would serve a body predating their own
// recommend or comment back to them.
export const CACHEABLE_ROUTES = new Set<string>([
  "get_profiles",
  "get_standard_site_posts",
  "get_standard_site_publications",
  "get_publication_recommendations",
  "search_publication_names",
]);
