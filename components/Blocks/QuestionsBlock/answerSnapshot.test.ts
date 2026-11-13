import { expect, test, vi } from "vitest";

// The editor modules behind answerSnapshot construct supabase clients on
// import.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_API_URL ||= "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-key";
});

import { Replicache, TEST_LICENSE_KEY, WriteTransaction } from "replicache";
import { v7 } from "uuid";
import * as Y from "yjs";
import * as base64 from "base64-js";
import type { Fact } from "src/replicache";
import { mutations } from "src/replicache/mutations";
import { clientMutationContext } from "src/replicache/clientMutationContext";
import { scanIndex } from "src/replicache/utils";
import { createUndoManager } from "src/undoManager";
import {
  revertAnswerToPublished,
  snapshotPublishedAnswer,
} from "./answerSnapshot";

const ANSWER = "answer-entity";

function makeRep() {
  let undoManager = createUndoManager();
  let rep: Replicache<any>;
  rep = new Replicache({
    name: `answer-snapshot-test-${Math.random()}`,
    licenseKey: TEST_LICENSE_KEY,
    kvStore: "mem",
    pullInterval: null,
    pushDelay: 1000 * 60 * 60,
    pusher: async () => ({
      response: { error: "unsupported" } as any,
      httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
    }),
    mutators: Object.fromEntries(
      Object.keys(mutations).map((m) => [
        m,
        async (tx: WriteTransaction, args: any) => {
          await mutations[m as keyof typeof mutations](
            args,
            clientMutationContext(tx, {
              permission_token_id: "test-token",
              rootEntity: "test-root",
              sessionDid: null,
              undoManager,
              rep: rep!,
              ignoreUndo: true,
              defaultEntitySet: "test-set",
            }) as any,
          );
        },
      ]),
    ),
    indexes: {
      eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
      vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
    },
  });
  return rep;
}

function write(content: string, from?: string) {
  let doc = new Y.Doc();
  if (from) Y.applyUpdate(doc, base64.toByteArray(from));
  let fragment = doc.getXmlFragment("prosemirror");
  fragment.delete(0, fragment.length);
  let paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [new Y.XmlText(content)]);
  fragment.insert(0, [paragraph]);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}

function read(value: string) {
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(value));
  return doc.getXmlFragment("prosemirror").toJSON();
}

async function addText(
  rep: Replicache<any>,
  parent: string,
  position: string,
  content: string,
) {
  let entity = v7();
  await rep.mutate.addBlock({
    parent,
    permission_set: "s",
    factID: v7(),
    type: "text",
    newEntityID: entity,
    position,
  });
  await rep.mutate.assertFact({
    entity,
    attribute: "block/text",
    data: { type: "text", value: write(content) },
  });
  return entity;
}

// The answer's blocks in order, each with its text and its children's text.
async function answerText(rep: Replicache<any>, parent = ANSWER) {
  let blocks = await rep.query(async (tx) => {
    let scan = scanIndex(tx);
    let refs = (await scan.eav(parent, "card/block")) as Fact<"card/block">[];
    refs.sort((a, b) => (a.data.position > b.data.position ? 1 : -1));
    return Promise.all(
      refs.map(async (ref) => ({
        entity: ref.data.value,
        text: read(
          (await scan.eav(ref.data.value, "block/text"))[0].data.value,
        ),
      })),
    );
  });
  let out: unknown[] = [];
  for (let block of blocks)
    out.push([block.text, await answerText(rep, block.entity)]);
  return out;
}

async function factCount(rep: Replicache<any>) {
  return rep.query(
    async (tx) => (await tx.scan({ indexName: "eav" }).toArray()).length,
  );
}

test("reverting puts the answer back to what was published", async () => {
  let rep = makeRep();
  let first = await addText(rep, ANSWER, "a0", "hello");
  let second = await addText(rep, ANSWER, "a1", "second");
  let nested = await addText(rep, second, "a0", "nested");
  await snapshotPublishedAnswer(rep as any, ANSWER);
  let published = await answerText(rep);
  let publishedFacts = await factCount(rep);

  let [current] = await rep.query((tx) =>
    scanIndex(tx).eav(first, "block/text"),
  );
  await rep.mutate.assertFact({
    entity: first,
    attribute: "block/text",
    data: { type: "text", value: write("hello there", current.data.value) },
  });
  await addText(rep, first, "a0", "added under a published block");
  await addText(rep, ANSWER, "a2", "added");
  await rep.mutate.removeBlock([
    { blockEntity: nested },
    { blockEntity: second },
  ]);
  expect(await answerText(rep)).not.toEqual(published);

  expect(await revertAnswerToPublished(rep as any, ANSWER, "s")).toBe(true);
  expect(await answerText(rep)).toEqual(published);
  expect(await factCount(rep)).toBe(publishedFacts);

  // The snapshot still describes the published blocks after a revert.
  await addText(rep, ANSWER, "a3", "added again");
  expect(await revertAnswerToPublished(rep as any, ANSWER, "s")).toBe(true);
  expect(await answerText(rep)).toEqual(published);
  expect(await factCount(rep)).toBe(publishedFacts);
});

test("there is nothing to revert to without a snapshot", async () => {
  let rep = makeRep();
  await addText(rep, ANSWER, "a0", "hello");
  expect(await revertAnswerToPublished(rep as any, ANSWER, "s")).toBe(false);
  expect(await answerText(rep)).toEqual([["<paragraph>hello</paragraph>", []]]);
});
