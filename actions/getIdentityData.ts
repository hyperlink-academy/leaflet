"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function getIdentityData() {
  let cookieStore = cookies();
  let auth_token = cookieStore.get("auth_token")?.value;
  let auth_res = auth_token
    ? await supabase
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            home_leaflet:permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
            permission_token_on_homepage(created_at, permission_tokens!inner(*, permission_token_rights(*)))
          )`,
        )
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;
  return auth_res.data.identities;
}
