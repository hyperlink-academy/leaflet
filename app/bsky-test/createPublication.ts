"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient } from "lexicons/src";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";

export async function createPublication(name: string) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;
  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let result = await agent.pub.leaflet.publication.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    {
      name,
    },
  );
  console.log(result);
}
