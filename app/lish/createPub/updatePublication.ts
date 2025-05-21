"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient, PubLeafletPublication } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

export async function updatePublication({
  uri,
  name,
  description,
  iconFile,
}: {
  uri: string;
  name: string;
  description: string;
  iconFile: File | null;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingPub } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .single();
  if (!existingPub || existingPub.identity_did! === identity.atp_did) return;

  let record: PubLeafletPublication.Record = {
    $type: "pub.leaflet.publication",
    name,
    ...(existingPub.record as object),
  };

  if (description) {
    record.description = description;
  }

  // Upload the icon if provided How do I tell if there isn't a new one?
  if (iconFile && iconFile.size > 0) {
    const buffer = await iconFile.arrayBuffer();
    const uploadResult = await agent.com.atproto.repo.uploadBlob(
      new Uint8Array(buffer),
      { encoding: iconFile.type },
    );

    if (uploadResult.data.blob) {
      record.icon = uploadResult.data.blob;
    }
  }

  let result = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: TID.nextStr(),
    record,
    collection: record.$type,
    validate: false,
  });

  //optimistically write to our db!
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .update({
      identity_did: credentialSession.did!,
      name: record.name,
      record: record as Json,
    })
    .eq("uri", uri)
    .select()
    .single();

  return { success: true, publication };
}
