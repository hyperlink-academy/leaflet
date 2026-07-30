import { cache } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { getAuthIdentity } from "./auth";

// The viewer's home-page permission token with its whole fact tree, fetched
// only by the routes that actually mount it. It used to ride along on
// getIdentityData, which serializes into the client identity context — so the
// facts shipped twice in the HTML on home pages and once for nothing on every
// other identity route. Deliberately not a "use server" module: exporting an
// async fn from one would publish it as a client-callable endpoint.
export const getHomeLeaflet = cache(uncachedGetHomeLeaflet);
async function uncachedGetHomeLeaflet() {
  let identity = await getAuthIdentity();
  if (!identity?.home_page) return null;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select(`*, permission_token_rights(*, entity_sets(entities(facts(*))))`)
    .eq("id", identity.home_page)
    .maybeSingle();
  return data ?? null;
}
