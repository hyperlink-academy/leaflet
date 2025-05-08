"use server";

import { IdResolver } from "@atproto/identity";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
let idResolver = new IdResolver();
export async function getIdentityData() {
  let cookieStore = await cookies();
  let auth_token = cookieStore.get("auth_token")?.value;
  let auth_res = auth_token
    ? await supabase
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            subscribers_to_publications(*),
            custom_domains(*),
            home_leaflet:permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
            permission_token_on_homepage(created_at, permission_tokens!inner(id, root_entity, permission_token_rights(*)))
          )`,
        )
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;
  if (auth_res.data.identities.atp_did) {
    //I should create a relationship table so I can do this in the above query
    let { data: publications } = await supabase
      .from("publications")
      .select("*")
      .eq("identity_did", auth_res.data.identities.atp_did);
    let resolved_did = await idResolver.did.resolve(
      auth_res.data.identities.atp_did,
    );
    return {
      ...auth_res.data.identities,
      publications: publications || [],
      resolved_did,
    };
  }

  return { ...auth_res.data.identities, publications: [], resolved_did: null };
}
