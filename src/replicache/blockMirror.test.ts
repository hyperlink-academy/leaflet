// The block-structure mirror (blockMirror.ts) is the only live source for
// block lists — everything renders and one-shot-reads through it. Its
// incrementally-maintained buckets must therefore match a from-scratch
// rebuild over a full dump of the committed facts. These tests drive real
// mutations through a Replicache instance and check that parity after each
// structural change, plus that typing (block/text) never notifies.
import { expect, test } from "vitest";
import { Replicache, TEST_LICENSE_KEY, WriteTransaction } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import type { Fact } from ".";
import { mutations } from "./mutations";
import { clientMutationContext } from "./clientMutationContext";
import { getBlocksWithTypeLocal, getBlocksFromMirror } from "./getBlocks";
import { getPostImageEntities } from "components/Blocks/ImageGalleryBlock/getPostImages";
import { getBlockStructureMirror } from "./blockMirror";
import { createUndoManager } from "src/undoManager";
import { deepEquals } from "src/utils/deepEquals";
import * as Y from "yjs";
import * as base64 from "base64-js";

const ROOT = "root-entity";

// removeBlock's runOnClient constructs a supabase client even when it has
// nothing to do; give it something to construct with.
process.env.NEXT_PUBLIC_SUPABASE_API_URL ||= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

function makeTextValue(text: string) {
  let doc = new Y.Doc();
  let frag = doc.getXmlFragment("prosemirror");
  let p = new Y.XmlElement("paragraph");
  p.insert(0, [new Y.XmlText(text)]);
  frag.insert(0, [p]);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}

function makeRep() {
  let undoManager = createUndoManager();
  let rep: Replicache<any>;
  const wrapped = Object.fromEntries(
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
  );
  rep = new Replicache({
    name: `mirror-test-${Math.random()}`,
    licenseKey: TEST_LICENSE_KEY,
    kvStore: "mem",
    pullInterval: null,
    pushDelay: 1000 * 60 * 60,
    pusher: async () => ({
      response: { error: "unsupported" } as any,
      httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
    }),
    mutators: {
      ...wrapped,
      initialize: async (tx: WriteTransaction) => {
        await tx.set("initialized", true);
      },
    },
    indexes: {
      eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
      vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
    },
  });
  return rep;
}

// Wait until the mirror has applied all diffs from committed mutations. Watch
// callbacks fire before the mutate promise resolves, so one macrotask is
// plenty; poll a few to be safe on slow CI.
async function settle() {
  await new Promise((r) => setTimeout(r, 25));
}

async function expectParity(rep: Replicache<any>, entityID: string) {
  let mirror = getBlockStructureMirror(rep as any);
  let allFacts = await rep.query(
    async (tx) =>
      (await tx.scan({ indexName: "eav" }).toArray()) as Fact<any>[],
  );
  let fromFacts = getBlocksWithTypeLocal(allFacts, entityID);
  let fromMirror = getBlocksFromMirror(mirror, entityID);
  expect(fromMirror).toEqual(fromFacts);
}

test("mirror matches a full-fact rebuild through structural mutations", async () => {
  let rep = makeRep();
  let mirror = getBlockStructureMirror(rep as any);
  expect(mirror.populated).toBe(false);

  await (rep.mutate as any).initialize();

  // Build a doc: plain text, headings, an ordered checklist with a nested child
  let pos: string | null = null;
  let entities: string[] = [];
  for (let i = 0; i < 12; i++) {
    pos = generateKeyBetween(pos, null);
    let entity = v7();
    entities.push(entity);
    await rep.mutate.addBlock({
      parent: ROOT,
      permission_set: "s",
      factID: v7(),
      type: i % 5 === 0 ? "heading" : "text",
      newEntityID: entity,
      position: pos,
      ...(i % 3 === 0
        ? { list: { listStyle: "ordered" as const, checklist: i % 6 === 0 } }
        : {}),
    });
    if (i % 5 === 0)
      await rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: (i % 3) + 1 },
      });
  }
  // nested list child under the first list block
  let child = v7();
  await rep.mutate.addBlock({
    parent: entities[0],
    permission_set: "s",
    factID: v7(),
    type: "text",
    newEntityID: child,
    position: "a0",
    list: {},
  });
  await settle();
  expect(mirror.populated).toBe(true);
  let blocks = getBlocksFromMirror(mirror, ROOT);
  expect(blocks.length).toBe(13);
  await expectParity(rep, ROOT);

  // Enter in the middle: insert a block between two existing ones
  await rep.mutate.addBlock({
    parent: ROOT,
    permission_set: "s",
    factID: v7(),
    type: "text",
    newEntityID: v7(),
    position: generateKeyBetween(
      blocks.find((b) => b.entityID === entities[4])!.position,
      blocks.find((b) => b.entityID === entities[5])!.position,
    ),
  });
  await settle();
  await expectParity(rep, ROOT);

  // Reparent: move the nested child to another list block. The card/block
  // fact keeps its id but changes entity — the mirror must move it between
  // buckets on the change op.
  await rep.mutate.moveChildren({
    oldParent: entities[0],
    newParent: entities[3],
    after: null,
  });
  await settle();
  await expectParity(rep, ROOT);
  expect(
    getBlocksFromMirror(mirror, ROOT).find((b) => b.entityID === child)?.listData
      ?.parent,
  ).toBe(entities[3]);

  // Delete a block
  await rep.mutate.removeBlock({ blockEntity: entities[7] });
  await settle();
  await expectParity(rep, ROOT);
  expect(
    getBlocksFromMirror(mirror, ROOT).find((b) => b.entityID === entities[7]),
  ).toBe(undefined);

  // Un-list a block
  await rep.mutate.retractAttribute({
    entity: entities[3],
    attribute: "block/is-list",
  });
  await settle();
  await expectParity(rep, ROOT);

  // Typing: block/text writes must not notify mirror subscribers
  let notifications = 0;
  let unsubscribe = mirror.subscribe(() => notifications++);
  await rep.mutate.assertFact({
    entity: entities[1],
    attribute: "block/text",
    data: { type: "text", value: makeTextValue("hello") },
  });
  await settle();
  expect(notifications).toBe(0);
  // ...while structural writes do
  await rep.mutate.assertFact({
    entity: entities[1],
    attribute: "block/heading-level",
    data: { type: "number", value: 2 },
  });
  await settle();
  expect(notifications).toBe(1);

  // Back-to-back commits from a single user action (Enter on a list item:
  // addBlock then moveChildren) coalesce into one deferred notification, so
  // listeners recompute once against the settled state instead of once per
  // commit. The mutate chain is microtask-only, so the flush timer can't
  // fire between the two awaited mutations.
  await rep.mutate.assertFact({
    entity: entities[1],
    attribute: "block/heading-level",
    data: { type: "number", value: 3 },
  });
  await rep.mutate.assertFact({
    entity: entities[2],
    attribute: "block/heading-level",
    data: { type: "number", value: 1 },
  });
  await settle();
  expect(notifications).toBe(2);
  unsubscribe();

  await rep.close();
});

test("gallery images are mirrored for lightbox paging", async () => {
  let rep = makeRep();
  // A fresh mirror populates asynchronously; create it before mutating, as
  // the render hooks do in the app, so the one-shot read below sees them.
  getBlockStructureMirror(rep as any);
  await (rep.mutate as any).initialize();

  let img1 = v7();
  let gallery = v7();
  let img2 = v7();
  let p1 = generateKeyBetween(null, null);
  let p2 = generateKeyBetween(p1, null);
  let p3 = generateKeyBetween(p2, null);
  for (let [entity, type, position] of [
    [img1, "image", p1],
    [gallery, "image-gallery", p2],
    [img2, "image", p3],
  ] as const) {
    await rep.mutate.addBlock({
      parent: ROOT,
      permission_set: "s",
      factID: v7(),
      type,
      newEntityID: entity,
      position,
    });
  }
  // Insert gallery children out of order to exercise the position sort.
  let child1 = v7();
  let child2 = v7();
  await rep.mutate.assertFact({
    entity: gallery,
    attribute: "gallery/image",
    data: { type: "ordered-reference", position: "a1", value: child2 },
  });
  await rep.mutate.assertFact({
    entity: gallery,
    attribute: "gallery/image",
    data: { type: "ordered-reference", position: "a0", value: child1 },
  });
  await settle();

  expect(getPostImageEntities(rep as any, ROOT)).toEqual([
    img1,
    child1,
    child2,
    img2,
  ]);

  await rep.close();
});
