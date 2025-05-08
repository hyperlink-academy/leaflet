"use server";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { Vercel } from "@vercel/sdk";

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
  let auth_token = (await cookies()).get("auth_token")?.value;
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

  await supabase.from("custom_domain_routes").delete().eq("domain", domain);
  await supabase.from("custom_domains").delete().eq("domain", domain);
  await vercel.projects.removeProjectDomain({
    idOrName: "prj_9jX4tmYCISnm176frFxk07fF74kG",
    teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
    domain,
  });

  return true;
}
