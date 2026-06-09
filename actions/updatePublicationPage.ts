"use server";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import {
  isExternalLink,
  normalizeExternalLink,
} from "src/utils/externalPublicationLink";

export async function updatePublicationPage(args: {
  publication_uri: string;
  page_id: number;
  title: string;
  path: string;
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

  let { data: page } = await supabaseServerClient
    .from("publication_pages")
    .select("id, leaflet_src")
    .eq("id", args.page_id)
    .eq("publication", args.publication_uri)
    .single();
  if (!page) return { success: false };

  // A tab's type is fixed at creation and discriminated by leaflet_src:
  // external link tabs have no backing leaflet and must keep a valid full url;
  // hosted pages must keep a relative path. Rejecting type flips here keeps a
  // hosted page from orphaning its leaflet (and its published record) and an
  // external tab from becoming an un-editable, un-publishable hosted page.
  let external = !page.leaflet_src;
  let path = args.path;
  if (external) {
    let normalized = normalizeExternalLink(path);
    if (!normalized) return { success: false };
    path = normalized;
  } else if (isExternalLink(path)) {
    return { success: false };
  }

  let { error } = await supabaseServerClient
    .from("publication_pages")
    .update({ title: args.title, path })
    .eq("id", args.page_id)
    .eq("publication", args.publication_uri);
  if (error) return { success: false };

  return { success: true };
}
