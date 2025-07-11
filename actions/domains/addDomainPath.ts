"use server";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { getIdentityData } from "actions/getIdentityData";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function addDomainPath({
  domain,
  view_permission_token,
  edit_permission_token,
  route,
}: {
  domain: string;
  view_permission_token: string;
  edit_permission_token: string;
  route: string;
}) {
  let auth_data = await getIdentityData();
  if (!auth_data || !auth_data.custom_domains.find((d) => d.domain === domain))
    return null;

  await supabase
    .from("custom_domain_routes")
    .delete()
    .eq("edit_permission_token", edit_permission_token);

  await supabase.from("custom_domain_routes").insert({
    domain,
    route,
    view_permission_token,
    edit_permission_token,
  });
  return true;
}
