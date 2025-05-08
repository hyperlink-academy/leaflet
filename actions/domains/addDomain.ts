"use server";
import { Vercel } from "@vercel/sdk";
import { cookies } from "next/headers";

import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function addDomain(domain: string) {
  let auth_token = (await cookies()).get("auth_token")?.value;
  if (!auth_token) return {};
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
  if (!auth_data || !auth_data.email) return {};
  if (
    domain.includes("leaflet.pub") &&
    ![
      "celine@hyperlink.academy",
      "brendan@hyperlink.academy",
      "jared@hyperlink.academy",
      "brendan.schlagel@gmail.com",
    ].includes(auth_data.email)
  )
    return {};

  try {
    await vercel.projects.addProjectDomain({
      idOrName: "prj_9jX4tmYCISnm176frFxk07fF74kG",
      teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
      requestBody: {
        name: domain,
      },
    });
  } catch (e) {
    console.log(e);
    let error: "unknown-error" | "invalid_domain" | "domain_already_in_use" =
      "unknown-error";
    if ((e as any).rawValue) {
      error =
        (e as { rawValue?: { error?: { code?: "invalid_domain" } } })?.rawValue
          ?.error?.code || "unknown-error";
    }
    if ((e as any).body) {
      try {
        error = JSON.parse((e as any).body)?.error?.code || "unknown-error";
      } catch (e) {}
    }

    return { error };
  }

  await supabase.from("custom_domains").insert({
    domain,
    identity: auth_data.email,
    confirmed: false,
  });
  return {};
}
