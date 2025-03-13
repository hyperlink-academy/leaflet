"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient, PubLeafletPagesLinearDocument } from "lexicons/src";
import { CredentialSession } from "@atproto/api";

export async function createRecord() {
  let credentialSession = new CredentialSession(new URL("https://bsky.social"));
  await credentialSession.login({
    identifier: "awarm.space",
    password: "gaz7-pigt-3j5u-raq3",
  });
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let result = await agent.pub.leaflet.document.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    {
      author: credentialSession.did!,
      title: "my first post",
      pages: [
        {
          $type: "pub.leaflet.pages.linearDocument",
          blocks: [
            {
              $type: "pub.leaflet.pages.linearDocument#block",
              alignment: PubLeafletPagesLinearDocument.TEXTALIGNCENTER,
              block: {
                $type: "pub.leaflet.blocks.text",
                plaintext: "Hello world!",
              },
            },
            {
              $type: "pub.leaflet.pages.linearDocument#block",
              block: {
                $type: "pub.leaflet.blocks.text",
                plaintext: "Hello world!",
              },
            },
          ],
        },
      ],
    },
  );
  console.log(result);
}
