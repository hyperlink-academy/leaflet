"use server";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { Vercel } from "@vercel/sdk";
import { getIdentityData } from "actions/getIdentityData";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});
export async function deleteDomain({ domain }: { domain: string }) {
  let identity = await getIdentityData();
  if (!identity || !identity.custom_domains.find((d) => d.domain === domain))
    return null;

  await Promise.all([
    supabase.from("custom_domain_routes").delete().eq("domain", domain),
    supabase.from("publication_domains").delete().eq("domain", domain),
  ]);
  await Promise.all([
    supabase.from("custom_domains").delete().eq("domain", domain),
    vercel.projects.removeProjectDomain({
      idOrName: "prj_9jX4tmYCISnm176frFxk07fF74kG",
      teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
      domain,
    }),
  ]);

  return true;
}
