"use server";

import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";

export async function setTutorialState(tutorial: boolean) {
  let identity = await getAuthIdentity();
  if (!identity) return;
  await supabaseServerClient
    .from("identities")
    .update({ tutorial })
    .eq("id", identity.id);
}
