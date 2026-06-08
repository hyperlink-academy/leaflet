"use server";
import { generateKeyBetween } from "fractional-indexing";
import { getIdentityData } from "actions/getIdentityData";
import { createNewLeaflet, type DefaultBlockSpec } from "./createNewLeaflet";
import { supabaseServerClient } from "supabase/serverClient";

export async function createPublicationPage(args: {
  publication_uri: string;
  path: string;
  title?: string;
  sort_order?: string;
  includePostsList?: boolean;
  includeSignup?: boolean;
}) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did, record")
    .eq("uri", args.publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did)
    return null;

  let description =
    (publication.record as { description?: string } | null)?.description ?? "";

  let sort_order = args.sort_order;
  if (!sort_order) {
    let { data: last } = await supabaseServerClient
      .from("publication_pages")
      .select("sort_order")
      .eq("publication", args.publication_uri)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sort_order = generateKeyBetween(last?.sort_order ?? null, null);
  }

  let firstBlocks: DefaultBlockSpec[] = [
    description ? { type: "text" as const, content: description } : "text",
    ...(args.includePostsList ? (["posts-list"] as const) : []),
    ...(args.includeSignup ? (["signup"] as const) : []),
  ];
  let leaflet_src = await createNewLeaflet({
    pageType: "doc",
    redirectUser: false,
    firstBlocks,
    addToHomepage: false,
  });

  let { data: page } = await supabaseServerClient
    .from("publication_pages")
    .insert({
      publication: args.publication_uri,
      leaflet_src,
      path: args.path,
      title: args.title ?? "",
      sort_order,
    })
    .select("*")
    .single();

  return page;
}
