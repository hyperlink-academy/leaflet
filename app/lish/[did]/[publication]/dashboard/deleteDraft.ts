"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePath } from "next/cache";

export async function deleteDraft(leaflet_id: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  await Promise.all([
    supabaseServerClient
      .from("leaflets_in_publications")
      .delete()
      .eq("leaflet", leaflet_id),
  ]);
  return revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
}
