"use server";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "./getIdentityData";

export async function unsubscribeFromPublication(publication: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.email) return null;
  //This is an email relation!!
  await supabaseServerClient
    .from("subscribers_to_publications")
    .delete()
    .eq("publication", publication)
    .eq("identity", identity.email);
}
