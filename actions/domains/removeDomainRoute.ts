"use server";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { getIdentityData } from "actions/getIdentityData";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function removeDomainRoute({ routeId }: { routeId: string }) {
  let identity = await getIdentityData();
  if (!identity) return null;

  // Verify the route belongs to one of the user's domains
  let allRoutes = identity.custom_domains.flatMap(
    (d) => d.custom_domain_routes,
  );
  if (!allRoutes.find((r) => r.id === routeId)) return null;

  await supabase.from("custom_domain_routes").delete().eq("id", routeId);

  return true;
}
