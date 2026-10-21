"use server";
import { getAuthIdentity } from "src/auth";
import { createNewLeaflet } from "./createNewLeaflet";
import { supabaseServerClient } from "supabase/serverClient";
import { isConfirmedContributor } from "src/contributorPermissions";

export async function createPublicationDraft(
  publication_uri: string,
  pageType: "canvas" | "doc" = "doc",
  options: {
    emailOnly?: boolean;
    // The post (and its reply block) this draft will reply to
    replyTo?: { subject: string; block?: string };
  } = {},
) {
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did) return null;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publication_uri)
    .single();
  if (!publication) return null;

  let isOwner = publication.identity_did === identity.atp_did;
  if (
    !isOwner &&
    !(await isConfirmedContributor(publication_uri, identity.atp_did))
  )
    return null;

  let newLeaflet = await createNewLeaflet({
    pageType,
    canvasPostHeader: true,
    redirectUser: false,
    firstBlockType: "text",
    analytics: { kind: "publication_draft", publication: publication_uri },
  });

  await supabaseServerClient.from("leaflets_in_publications").insert({
    publication: publication_uri,
    leaflet: newLeaflet,
    doc: null,
    email_only: !!options.emailOnly,
    reply_to: options.replyTo?.subject ?? null,
    reply_to_block: options.replyTo?.block ?? null,
  });

  // If a contributor created the draft, automatically add them as a draft
  // contributor so it shows up on their dashboard.
  if (!isOwner && newLeaflet) {
    await supabaseServerClient
      .from("leaflet_contributors")
      .upsert(
        { leaflet: newLeaflet, contributor_did: identity.atp_did },
        { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
      );
  }

  return newLeaflet;
}
