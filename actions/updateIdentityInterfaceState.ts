"use server";

import { InterfaceState } from "components/IdentityProvider";
import { getIdentityData } from "./getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function updateIdentityInterfaceState(
  interfaceState: InterfaceState,
) {
  let identity = await getIdentityData();
  if (!identity) return;
  await supabaseServerClient
    .from("identities")
    .update({ interface_state: interfaceState })
    .eq("id", identity.id);
}
