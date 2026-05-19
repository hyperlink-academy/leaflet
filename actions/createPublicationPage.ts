"use server";
import { getIdentityData } from "actions/getIdentityData";
import { createNewLeaflet } from "./createNewLeaflet";
import { supabaseServerClient } from "supabase/serverClient";

export async function createPublicationPage(args: {
  publication_uri: string;
  path: string;
  title?: string;
}) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .eq("uri", args.publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did)
    return null;

  let leaflet_src = await createNewLeaflet({
    pageType: "doc",
    redirectUser: false,
    firstBlocks: ["text", "posts-list"],
    addToHomepage: false,
  });

  let { data: page } = await supabaseServerClient
    .from("publication_pages")
    .insert({
      publication: args.publication_uri,
      leaflet_src,
      path: args.path,
      title: args.title ?? "",
    })
    .select("*")
    .single();

  return page;
}
