"use server";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { getIdentityData } from "actions/getIdentityData";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function assignDomainToDocument({
  domain,
  route,
  view_permission_token,
  edit_permission_token,
}: {
  domain: string;
  route: string;
  view_permission_token: string;
  edit_permission_token: string;
}) {
  let identity = await getIdentityData();
  if (!identity || !identity.custom_domains.find((d) => d.domain === domain))
    return null;

  await Promise.all([
    supabase.from("publication_domains").delete().eq("domain", domain),
    supabase
      .from("custom_domain_routes")
      .delete()
      .eq("edit_permission_token", edit_permission_token),
  ]);

  await supabase.from("custom_domain_routes").insert({
    domain,
    route,
    view_permission_token,
    edit_permission_token,
  });

  return true;
}
