"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient } from "lexicons/src";
import { CredentialSession } from "@atproto/api";

export async function createPublication(name: string) {
  let credentialSession = new CredentialSession(new URL("https://bsky.social"));
  await credentialSession.login({
    identifier: "awarm.space",
    password: "gaz7-pigt-3j5u-raq3",
  });
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
