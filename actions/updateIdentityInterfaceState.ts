"use server";

import { InterfaceState } from "components/IdentityProvider";
import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";

export async function updateIdentityInterfaceState(
  interfaceState: InterfaceState,
) {
  let identity = await getAuthIdentity();
  if (!identity) return;
  await supabaseServerClient
    .from("identities")
    .update({ interface_state: interfaceState })
    .eq("id", identity.id);
}
