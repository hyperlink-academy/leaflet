"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient, PubLeafletPublication } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Un$Typed } from "@atproto/api";
import { Json } from "supabase/database.types";

export async function createPublication({
  name,
  description,
  iconFile,
}: {
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
  let record: Un$Typed<PubLeafletPublication.Record> = {
    name,
  };

  if (description) {
    record.description = description;
  }

  // Upload the icon if provided
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

  let result = await agent.pub.leaflet.publication.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    record,
  );

  //optimistically write to our db!
  await supabaseServerClient.from("publications").upsert({
    uri: result.uri,
    identity_did: credentialSession.did!,
    name: record.name,
    record: record as Json,
  });

  return { success: true, name };
}
