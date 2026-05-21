"use server";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function reorderPublicationPages(args: {
  publication_uri: string;
  page_id: number;
  sort_order: string;
}): Promise<{ success: boolean }> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return { success: false };

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .eq("uri", args.publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did)
    return { success: false };

  let { error } = await supabaseServerClient
    .from("publication_pages")
    .update({ sort_order: args.sort_order })
    .eq("id", args.page_id)
    .eq("publication", args.publication_uri);
  if (error) return { success: false };

  return { success: true };
}
