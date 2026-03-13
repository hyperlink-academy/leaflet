"use server";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { getIdentityData } from "actions/getIdentityData";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function removeDomainAssignment({
  domain,
}: {
  domain: string;
}) {
  let identity = await getIdentityData();
  if (!identity || !identity.custom_domains.find((d) => d.domain === domain))
    return null;

  await supabase.from("custom_domain_routes").delete().eq("domain", domain);
  await supabase.from("publication_domains").delete().eq("domain", domain);

  return true;
}
