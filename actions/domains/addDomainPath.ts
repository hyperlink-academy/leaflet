"use server";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";

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
  let auth_token = cookies().get("auth_token")?.value;
  if (!auth_token) return null;
  let { data: auth_data } = await supabase
    .from("email_auth_tokens")
    .select(
      `*,
          identities(
            *,
            custom_domains(*)
          )`,
    )
    .eq("id", auth_token)
    .eq("confirmed", true)
    .single();
  if (
    !auth_data ||
    !auth_data.email ||
    !auth_data.identities?.custom_domains.find((d) => d.domain === domain)
  )
    return null;

  await supabase.from("custom_domain_routes").insert({
    domain,
    route,
    view_permission_token,
    edit_permission_token,
  });
  return true;
}
