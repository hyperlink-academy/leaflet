"use server";
import { Vercel } from "@vercel/sdk";
import { cookies } from "next/headers";

import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { getIdentityData } from "actions/getIdentityData";

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
  let identity = await getIdentityData();
  if (!identity || (!identity.email && !identity.atp_did)) return {};
  if (
    domain.includes("leaflet.pub") &&
    (!identity.email ||
      ![
        "celine@hyperlink.academy",
        "brendan@hyperlink.academy",
        "jared@hyperlink.academy",
        "brendan.schlagel@gmail.com",
      ].includes(identity.email))
  )
    return {};
  return await createDomain(domain, identity.email, identity.id);
}

export async function addPublicationDomain(
  domain: string,
  publication_uri: string,
) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return {};
  let { data: publication } = await supabase
    .from("publications")
    .select("*")
    .eq("uri", publication_uri)
    .single();

  if (publication?.identity_did !== identity.atp_did) return {};
  let { error } = await createDomain(domain, null, identity.id);
  if (error) return { error };
  await supabase.from("publication_domains").insert({
    publication: publication_uri,
    identity: identity.atp_did,
    domain,
  });
  return {};
}

async function createDomain(
  domain: string,
  email: string | null,
  identity_id: string,
) {
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
    identity: email,
    confirmed: false,
    identity_id,
  });
  return {};
}
