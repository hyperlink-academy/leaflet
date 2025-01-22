"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function getLeafletDomains(id: string) {
  let res = await supabase
    .from("permission_tokens")
    .select(
      "*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ",
    )
    .eq("id", id)
    .single();
  return res.data?.custom_domain_routes;
}
