import { TID } from "@atproto/common";
import {
  AtpBaseClient,
  PubLeafletBlocksText,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/src";
import { CredentialSession } from "@atproto/api";
import * as Y from "yjs";
import * as base64 from "base64-js";

import { IdResolver } from "@atproto/identity";
import { Fact, ReplicacheProvider } from "src/replicache";
import { v7 } from "uuid";
import { Pages } from "components/Pages";
import { generateKeyBetween } from "fractional-indexing";

const idResolver = new IdResolver();
export default async function RecordPage(props: {
  params: { rkey: string; handle: string };
}) {
  let credentialSession = new CredentialSession(new URL("https://bsky.social"));
  await credentialSession.login({
    identifier: "awarm.space",
    password: "gaz7-pigt-3j5u-raq3",
  });
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let repo = await idResolver.handle.resolve(props.params.handle);
  if (!repo) return <div>can't resolve</div>;

  let doc = await agent.pub.leaflet.document.get({
    repo,
    rkey: props.params.rkey,
  });
  if (!PubLeafletDocument.isRecord(doc.value)) {
    return <pre>not a doc?</pre>;
  }
  let facts: Fact<any>[] = [];
  let rootEntity = v7();
  let firstPage = v7();

  facts.push({
    id: v7(),
    entity: rootEntity,
    attribute: "root/page",
    data: { type: "ordered-reference", value: firstPage, position: "a0" },
  });

  let page = doc.value.pages[0];
  if (PubLeafletPagesLinearDocument.isMain(page) && page.blocks) {
    let p = null;
    for (let block of page.blocks) {
      if (PubLeafletBlocksText.isMain(block.block)) {
        let blockEntity = v7();
        let content = block.block.plaintext;
        let doc = new Y.Doc();
        let pm = doc.getXmlElement("prosemirror");
        let paragraph = new Y.XmlElement("paragraph");
        paragraph.insert(0, [new Y.XmlText(content)]);
        pm.push([paragraph]);

        p = generateKeyBetween(p, null);
        facts.push({
          id: v7(),
          entity: firstPage,
          attribute: "card/block",
          data: {
            value: blockEntity,
            position: p,
          },
        });
        facts.push({
          id: v7(),
          entity: blockEntity,
          attribute: "block/type",
          data: {
            type: "block-type-union",
            value: "text",
          },
        });
        facts.push({
          id: v7(),
          entity: blockEntity,
          attribute: "block/text",
          data: {
            type: "text",
            value: base64.fromByteArray(Y.encodeStateAsUpdate(doc)),
          },
        });
      }
    }
  }

  return (
    <ReplicacheProvider
      token={{}}
      rootEntity={rootEntity}
      name={""}
      initialFacts={facts}
      initialFactsOnly
    >
      <h1>{doc.value.title}</h1>
      <Pages rootPage={rootEntity} />
    </ReplicacheProvider>
  );
}
