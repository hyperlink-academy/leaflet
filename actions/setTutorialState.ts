"use server";

import { getAuthIdentity } from "src/auth";
import { Ok, Err, type Result } from "src/result";
import { supabaseServerClient } from "supabase/serverClient";

export async function setTutorialState(
  tutorial: boolean,
): Promise<Result<null, string>> {
  let identity = await getAuthIdentity();
  if (!identity) return Err("Not logged in");
  let { error } = await supabaseServerClient
    .from("identities")
    .update({ tutorial })
    .eq("id", identity.id);
  if (error) return Err("Couldn't save tutorial state");
  return Ok(null);
}
