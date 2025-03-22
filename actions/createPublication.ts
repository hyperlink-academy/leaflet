"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient } from "lexicons/src";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function createPublication(name: string) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;
  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record = {
    name,
  };
  let result = await agent.pub.leaflet.publication.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    record,
  );

  //optimistically write to our db!
  await supabaseServerClient.from("publications").upsert({
    uri: result.uri,
    identity_did: credentialSession.did!,
    name: record.name,
  });
}
