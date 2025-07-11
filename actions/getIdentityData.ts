"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";

export async function getIdentityData() {
  let cookieStore = await cookies();
  let auth_token =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            bsky_profiles(*),
            subscribers_to_publications(*),
            custom_domains!custom_domains_identity_id_fkey(publication_domains(*), *),
            home_leaflet:permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
            permission_token_on_homepage(
              created_at,
              permission_tokens!inner(
                id,
                root_entity,
                permission_token_rights(*),
                leaflets_in_publications(*, publications(*))
              )
            )
          )`,
        )
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;
  if (auth_res.data.identities.atp_did) {
    //I should create a relationship table so I can do this in the above query
    let { data: publications } = await supabaseServerClient
      .from("publications")
      .select("*")
      .eq("identity_did", auth_res.data.identities.atp_did);
    return {
      ...auth_res.data.identities,
      publications: publications || [],
    };
  }

  return { ...auth_res.data.identities, publications: [] };
}
