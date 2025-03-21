"use server";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "./getIdentityData";

export async function subscribeToPublicationWithEmail(publication: string) {
  let identity = await getIdentityData();
  console.log("yoohooo");
  console.log(identity);
  if (!identity || !identity.email) return null;
  //This is an email relation!!
  console.log(
    await supabaseServerClient
      .from("subscribers_to_publications")
      .insert({ publication: publication, identity: identity.email }),
  );
}
