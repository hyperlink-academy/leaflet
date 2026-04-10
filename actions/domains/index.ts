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

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

const VERCEL_PROJECT = "prj_9jX4tmYCISnm176frFxk07fF74kG";
const VERCEL_TEAM = "team_42xaJiZMTw9Sr7i0DcLTae9d";

// Shared helpers
// ==============

async function assertOwnsDomain(domain: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.custom_domains.find((d) => d.domain === domain))
    return null;
  return identity;
}

// Clear all assignments (routes + publication links) for a domain,
// without deleting the domain itself.
async function clearAllAssignments(domain: string) {
  await Promise.all([
    supabase.from("custom_domain_routes").delete().eq("domain", domain),
    supabase.from("publication_domains").delete().eq("domain", domain),
  ]);
}

// Adding domains
// ==============

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

async function createDomain(
  domain: string,
  email: string | null,
  identity_id: string,
) {
  try {
    await vercel.projects.addProjectDomain({
      idOrName: VERCEL_PROJECT,
      teamId: VERCEL_TEAM,
      requestBody: { name: domain },
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

// Assigning domains
// =================

// Point a domain at a leaflet document. Clears any existing assignment first,
// since a domain can only point to one thing at a time.
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
  if (!(await assertOwnsDomain(domain))) return null;

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

// Point a domain at a publication. Clears any existing assignment first.
export async function assignDomainToPublication({
  domain,
  publication_uri,
}: {
  domain: string;
  publication_uri: string;
}) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  if (!identity.custom_domains.find((d) => d.domain === domain)) return null;

  let { data: publication } = await supabase
    .from("publications")
    .select("*")
    .eq("uri", publication_uri)
    .single();
  if (publication?.identity_did !== identity.atp_did) return null;

  await clearAllAssignments(domain);

  await supabase.from("publication_domains").insert({
    publication: publication_uri,
    identity: identity.atp_did,
    domain,
  });

  return true;
}

// Removing assignments
// ====================

// Remove all assignments from a domain (routes + publication links),
// but keep the domain itself registered.
export async function removeDomainAssignment({
  domain,
}: {
  domain: string;
}) {
  if (!(await assertOwnsDomain(domain))) return null;
  await clearAllAssignments(domain);
  return true;
}

// Remove a single route assignment by ID.
export async function removeDomainRoute({ routeId }: { routeId: string }) {
  let identity = await getIdentityData();
  if (!identity) return null;

  let allRoutes = identity.custom_domains.flatMap(
    (d) => d.custom_domain_routes,
  );
  if (!allRoutes.find((r) => r.id === routeId)) return null;

  await supabase.from("custom_domain_routes").delete().eq("id", routeId);

  return true;
}

// Deleting domains
// ================

// Fully delete a domain: clear all assignments, remove from DB, and remove from Vercel.
export async function deleteDomain({ domain }: { domain: string }) {
  if (!(await assertOwnsDomain(domain))) return null;

  await clearAllAssignments(domain);
  await Promise.all([
    supabase.from("custom_domains").delete().eq("domain", domain),
    vercel.projects.removeProjectDomain({
      idOrName: VERCEL_PROJECT,
      teamId: VERCEL_TEAM,
      domain,
    }),
  ]);

  return true;
}
