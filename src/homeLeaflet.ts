import { cache } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { getValidAuthToken } from "./identityPayload";

// The viewer's home-page permission token with its whole fact tree, fetched
// only by the routes that actually mount it — folding it into getIdentityData
// would double-ship the facts in home-page HTML and add dead weight to every
// other identity route. Deliberately not a "use server" module: exporting an
// async fn from one would publish it as a client-callable endpoint.
//
// Kept as a single token→identity→token join rather than getAuthIdentity()
// followed by a permission_tokens lookup: this await gates the (home-pages)
// Suspense boundary, and a sequential second round trip holds that boundary
// in its loading fallback after the outer identity shell has already revealed.
export const getHomeLeaflet = cache(uncachedGetHomeLeaflet);
async function uncachedGetHomeLeaflet() {
  let auth_token = await getValidAuthToken();
  if (!auth_token) return null;
  let { data } = await supabaseServerClient
    .from("email_auth_tokens")
    .select(
      `identities(
        home_leaflet:permission_tokens!identities_home_page_fkey(*,
          permission_token_rights(*, entity_sets(entities(facts(*))))
        )
      )`,
    )
    .eq("id", auth_token)
    .eq("confirmed", true)
    .single();
  return data?.identities?.home_leaflet ?? null;
}
