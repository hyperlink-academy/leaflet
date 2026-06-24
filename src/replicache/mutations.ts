import { DeepReadonly, Replicache, WriteTransaction } from "replicache";
import type { Fact, ReplicacheMutators } from ".";
import type { Attribute, Attributes, FilterAttributes } from "./attributes";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { localImages } from "src/utils/addImage";

export type MutationContext = {
  permission_token_id: string;
  createEntity: (args: {
    entityID: string;
    permission_set: string;
  }) => Promise<boolean>;
  scanIndex: {
    eav: <A extends Attribute>(
      entity: string,
      attribute: A,
    ) => Promise<DeepReadonly<Fact<A>[]>>;
  };
  deleteEntity: (entity: string) => Promise<void>;
  assertFact: <A extends Attribute>(
    f: Omit<Fact<A>, "id"> & { id?: string },
  ) => Promise<void>;
  retractFact: (id: string) => Promise<void>;
  runOnServer(
    cb: (ctx: { supabase: SupabaseClient<Database> }) => Promise<void>,
  ): Promise<void>;
  runOnClient(
    cb: (ctx: {
      supabase: SupabaseClient<Database>;
      tx: WriteTransaction;
    }) => Promise<void>,
  ): Promise<void>;
};

type Mutation<T> = (
  args: T & { ignoreUndo?: true },
  ctx: MutationContext,
) => Promise<void>;

const addCanvasBlock: Mutation<{
  parent: string;
  permission_set: string;
  factID: string;
  type: Fact<"block/type">["data"]["value"];
  newEntityID: string;
  position: { x: number; y: number };
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.newEntityID,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.parent,
    id: args.factID,
    data: {
      type: "spatial-reference",
      value: args.newEntityID,
      position: args.position,
    },
    attribute: "canvas/block",
  });
  await ctx.assertFact({
    entity: args.newEntityID,
    data: { type: "block-type-union", value: args.type },
    attribute: "block/type",
  });
};

const addBlock: Mutation<{
  parent: string;
  permission_set: string;
  factID: string;
  type: Fact<"block/type">["data"]["value"];
  newEntityID: string;
  position: string;
  // Set in the same mutation as the type so the block is never briefly a
  // non-list block — otherwise a racing Enter sees no list data and inserts a
  // plain paragraph, breaking the list.
  list?: {
    listStyle?: Fact<"block/list-style">["data"]["value"];
    checklist?: boolean;
  };
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.newEntityID,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.parent,
    id: args.factID,
    data: {
      type: "ordered-reference",
      value: args.newEntityID,
      position: args.position,
    },
    attribute: "card/block",
  });
  await ctx.assertFact({
    entity: args.newEntityID,
    data: { type: "block-type-union", value: args.type },
    attribute: "block/type",
  });
  if (args.list) {
    await ctx.assertFact({
      entity: args.newEntityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
    if (args.list.listStyle) {
      await ctx.assertFact({
        entity: args.newEntityID,
        attribute: "block/list-style",
        data: { type: "list-style-union", value: args.list.listStyle },
      });
    }
    if (args.list.checklist !== undefined) {
      await ctx.assertFact({
        entity: args.newEntityID,
        attribute: "block/check-list",
        data: { type: "boolean", value: args.list.checklist },
      });
    }
  }
};

const addLastBlock: Mutation<{
  parent: string;
  factID: string;
  entity: string;
}> = async (args, ctx) => {
  let children = await ctx.scanIndex.eav(args.parent, "card/block");
  let lastChild = children.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[children.length - 1];
  await ctx.assertFact({
    entity: args.parent,
    id: args.factID,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      value: args.entity,
      position: generateKeyBetween(lastChild?.data.position || null, null),
    },
  });
};

const moveBlock: Mutation<{
  oldParent: string;
  block: string;
  newParent: string;
  position:
    | { type: "first" }
    | { type: "end" }
    | { type: "after"; entity: string };
}> = async (args, ctx) => {
  let children = (
    await ctx.scanIndex.eav(args.oldParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let newSiblings = (
    await ctx.scanIndex.eav(args.newParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let block = children.find((f) => f.data.value === args.block);
  if (!block) return;
  // Move by overwriting the block's existing card/block fact in place (reusing
  // its id) rather than retract-then-assert. assertFact captures the old
  // (parent, position) as the single undo entry, so undo/redo of a move never
  // passes through an intermediate state where the fact is gone and the block
  // disappears.
  let newPosition;
  let pos = args.position;
  switch (pos.type) {
    case "first": {
      newPosition = generateKeyBetween(
        null,
        newSiblings[0]?.data.position || null,
      );
      break;
    }
    case "end": {
      newPosition = generateKeyBetween(
        newSiblings[newSiblings.length - 1]?.data.position || null,
        null,
      );
      break;
    }
    case "after": {
      let index = newSiblings.findIndex((f) => f.data.value == pos?.entity);
      newPosition = generateKeyBetween(
        newSiblings[index]?.data.position || null,
        newSiblings[index + 1]?.data.position || null,
      );
    }
  }
  await ctx.assertFact({
    id: block.id,
    entity: args.newParent,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      value: block.data.value,
      position: newPosition,
    },
  });
};
const moveChildren: Mutation<{
  oldParent: string;
  newParent: string;
  after: string | null;
}> = async (args, ctx) => {
  let children = (
    await ctx.scanIndex.eav(args.oldParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let newSiblings = (
    await ctx.scanIndex.eav(args.newParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let index = newSiblings.findIndex((f) => f.data.value === args.after);
  let newPosition = generateKeyBetween(
    newSiblings[index]?.data.position || null,
    newSiblings[index + 1]?.data.position || null,
  );
  for (let child of children) {
    // Reparent each child by overwriting its existing card/block fact in place
    // (reusing its id) rather than retract-then-assert. assertFact captures the
    // old (parent, position) as the single undo entry, so undo/redo of the move
    // never passes through an intermediate state where the child fact is gone.
    await ctx.assertFact({
      id: child.id,
      entity: args.newParent,
      attribute: "card/block",
      data: {
        type: "ordered-reference",
        value: child.data.value,
        position: newPosition,
      },
    });
    newPosition = generateKeyBetween(
      newPosition,
      newSiblings[index + 1]?.data.position || null,
    );
  }
};

const outdentBlock: Mutation<{
  oldParent: string;
  newParent: string;
  after: string;
  block: string;
  excludeFromSiblings?: string[];
}> = async (args, ctx) => {
  //we should be able to get normal siblings here as we care only about one level
  let newSiblings = (
    await ctx.scanIndex.eav(args.newParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let currentSiblings = (
    await ctx.scanIndex.eav(args.oldParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));

  let currentFactIndex = currentSiblings.findIndex(
    (f) => f.data.value === args.block,
  );
  if (currentFactIndex === -1) return;
  // Bail before the writes below: a missing anchor here is a clean no-op, but
  // checking afterward would reparent the siblings under the block while leaving
  // the block itself unmoved, orphaning them and dropping them from the document.
  let index = newSiblings.findIndex((f) => f.data.value === args.after);
  if (index === -1) return;
  // Filter out blocks that are being processed separately (e.g., in multi-select outdent)
  let excludeSet = new Set(args.excludeFromSiblings || []);
  let currentSiblingsAfter = currentSiblings
    .slice(currentFactIndex + 1)
    .filter((sib) => !excludeSet.has(sib.data.value));
  let currentChildren = (
    await ctx.scanIndex.eav(args.block, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let lastPosition =
    currentChildren[currentChildren.length - 1]?.data.position || null;
  for (let sib of currentSiblingsAfter) {
    lastPosition = generateKeyBetween(lastPosition, null);
    // Reparent the sibling under the block by overwriting its card/block fact in
    // place (reusing its id) rather than retract-then-assert, so undo/redo of the
    // outdent never passes through an intermediate state where the sibling is gone.
    await ctx.assertFact({
      entity: args.block,
      id: sib.id,
      attribute: "card/block",
      data: {
        type: "ordered-reference",
        position: lastPosition,
        value: sib.data.value,
      },
    });
  }

  let newPosition = generateKeyBetween(
    newSiblings[index]?.data.position,
    newSiblings[index + 1]?.data.position || null,
  );
  // Move the block to its new parent by overwriting its existing card/block fact
  // in place (reusing its id) rather than retract-then-assert, so undo/redo of
  // the outdent never passes through an intermediate state where the block is
  // gone (its reparented children would be momentarily orphaned).
  await ctx.assertFact({
    id: currentSiblings[currentFactIndex].id,
    entity: args.newParent,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      position: newPosition,
      value: args.block,
    },
  });
};

const addPageLinkBlock: Mutation<{
  type: "canvas" | "doc";
  permission_set: string;
  blockEntity: string;
  firstBlockEntity: string;
  firstBlockFactID: string;
  pageEntity: string;
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.pageEntity,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.blockEntity,
    attribute: "block/card",
    data: { type: "reference", value: args.pageEntity },
  });
  await ctx.assertFact({
    attribute: "page/type",
    entity: args.pageEntity,
    data: { type: "page-type-union", value: args.type },
  });
  await addBlock(
    {
      factID: args.firstBlockFactID,
      permission_set: args.permission_set,
      newEntityID: args.firstBlockEntity,
      type: "heading",
      parent: args.pageEntity,
      position: "a0",
    },
    ctx,
  );
};

const retractFact: Mutation<{ factID: string }> = async (args, ctx) => {
  await ctx.retractFact(args.factID);
};

// Add a content page to a publication draft leaflet's nav, seeded with a
// single empty text block.
const addPublicationNavPage: Mutation<{
  rootEntity: string;
  pageEntity: string;
  permission_set: string;
  navFactID: string;
  route: string;
  title: string;
  firstBlockEntity: string;
  firstBlockFactID: string;
}> = async (args, ctx) => {
  let entries = await ctx.scanIndex.eav(args.rootEntity, "root/page");
  let last = entries.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[entries.length - 1];
  await ctx.createEntity({
    entityID: args.pageEntity,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    id: args.navFactID,
    entity: args.rootEntity,
    attribute: "root/page",
    data: {
      type: "ordered-reference",
      value: args.pageEntity,
      position: generateKeyBetween(last?.data.position || null, null),
    },
  });
  await ctx.assertFact({
    entity: args.pageEntity,
    attribute: "page/type",
    data: { type: "page-type-union", value: "doc" },
  });
  await ctx.assertFact({
    entity: args.pageEntity,
    attribute: "page/route",
    data: { type: "string", value: args.route },
  });
  await ctx.assertFact({
    entity: args.pageEntity,
    attribute: "page/title",
    data: { type: "string", value: args.title },
  });
  await addBlock(
    {
      factID: args.firstBlockFactID,
      permission_set: args.permission_set,
      newEntityID: args.firstBlockEntity,
      type: "text",
      parent: args.pageEntity,
      position: "a0",
    },
    ctx,
  );
};

// Add an external link tab: same root/page list as content pages, but with an
// external url and no content.
const addPublicationNavLink: Mutation<{
  rootEntity: string;
  linkEntity: string;
  permission_set: string;
  navFactID: string;
  url: string;
  title: string;
}> = async (args, ctx) => {
  let entries = await ctx.scanIndex.eav(args.rootEntity, "root/page");
  let last = entries.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[entries.length - 1];
  await ctx.createEntity({
    entityID: args.linkEntity,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    id: args.navFactID,
    entity: args.rootEntity,
    attribute: "root/page",
    data: {
      type: "ordered-reference",
      value: args.linkEntity,
      position: generateKeyBetween(last?.data.position || null, null),
    },
  });
  await ctx.assertFact({
    entity: args.linkEntity,
    attribute: "page/external-url",
    data: { type: "string", value: args.url },
  });
  await ctx.assertFact({
    entity: args.linkEntity,
    attribute: "page/title",
    data: { type: "string", value: args.title },
  });
};

const removePublicationNavEntry: Mutation<{
  rootEntity: string;
  entity: string;
}> = async (args, ctx) => {
  let entries = await ctx.scanIndex.eav(args.rootEntity, "root/page");
  let fact = entries.find((f) => f.data.value === args.entity);
  if (fact) await ctx.retractFact(fact.id);
  await ctx.deleteEntity(args.entity);
};

const removeBlock: Mutation<
  { blockEntity: string } | { blockEntity: string }[]
> = async (args, ctx) => {
  for (let block of [args].flat()) {
    let [image] = await ctx.scanIndex.eav(block.blockEntity, "block/image");
    await ctx.runOnServer(async ({ supabase }) => {
      if (image) {
        let paths = image.data.src.split("/");
        await supabase.storage
          .from("minilink-user-assets")
          .remove([paths[paths.length - 1]]);
      }
    });
    await ctx.runOnClient(async ({ tx }) => {
      if (image) {
        // Release the local preview's object URL.
        let localSrc = localImages.get(image.data.src);
        if (localSrc) {
          URL.revokeObjectURL(localSrc);
          localImages.delete(image.data.src);
        }
      }
    });
    await ctx.deleteEntity(block.blockEntity);
  }
};

const deleteEntity: Mutation<{ entity: string }> = async (args, ctx) => {
  await ctx.deleteEntity(args.entity);
};

export type FactInput = {
  [k in Attribute]: Omit<Fact<k>, "id"> & { id?: string };
}[Attribute];
const assertFact: Mutation<FactInput | Array<FactInput>> = async (
  args,
  ctx,
) => {
  for (let f of [args].flat()) {
    await ctx.assertFact(f);
  }
};

const increaseHeadingLevel: Mutation<{ entityID: string }> = async (
  args,
  ctx,
) => {
  let blockType = (await ctx.scanIndex.eav(args.entityID, "block/type"))[0];
  let headinglevel = (
    await ctx.scanIndex.eav(args.entityID, "block/heading-level")
  )[0];
  if (blockType?.data.value !== "heading")
    await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "heading" },
    });

  if (!headinglevel || blockType?.data.value !== "heading") {
    return await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/heading-level",
      data: { type: "number", value: 1 },
    });
  }
  if (headinglevel?.data.value === 3) return;
  return await ctx.assertFact({
    entity: args.entityID,
    attribute: "block/heading-level",
    data: { type: "number", value: headinglevel.data.value + 1 },
  });
};

const moveBlockUp: Mutation<{ entityID: string; parent: string }> = async (
  args,
  ctx,
) => {
  let children = (await ctx.scanIndex.eav(args.parent, "card/block")).toSorted(
    (a, b) => (a.data.position > b.data.position ? 1 : -1),
  );
  let index = children.findIndex((f) => f.data.value === args.entityID);
  if (index === -1) return;
  let next = children[index - 1];
  if (!next) return;
  // Reorder by overwriting the block's card/block fact in place (reusing its
  // id), so the move is a single undo entry and undo/redo never blanks the
  // block through an intermediate retracted state.
  await ctx.assertFact({
    id: children[index].id,
    entity: args.parent,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      position: generateKeyBetween(
        children[index - 2]?.data.position || null,
        next.data.position,
      ),
      value: args.entityID,
    },
  });
};
const moveBlockDown: Mutation<{
  entityID: string;
  parent: string;
  permission_set?: string;
}> = async (args, ctx) => {
  let children = (await ctx.scanIndex.eav(args.parent, "card/block")).toSorted(
    (a, b) => (a.data.position > b.data.position ? 1 : -1),
  );
  let index = children.findIndex((f) => f.data.value === args.entityID);
  if (index === -1) return;
  let next = children[index + 1];
  if (!next) {
    // If this is the last block, create a new empty block above it using the addBlock helper
    if (!args.permission_set) return; // Can't create block without permission_set

    let newEntityID = v7();
    let previousBlock = children[index - 1];
    let position = generateKeyBetween(
      previousBlock?.data.position || null,
      children[index].data.position,
    );

    // Call the addBlock mutation helper directly
    await addBlock(
      {
        parent: args.parent,
        permission_set: args.permission_set,
        factID: v7(),
        type: "text",
        newEntityID: newEntityID,
        position: position,
      },
      ctx,
    );
    return;
  }
  // Reorder by overwriting the block's card/block fact in place (reusing its
  // id), so the move is a single undo entry and undo/redo never blanks the
  // block through an intermediate retracted state.
  await ctx.assertFact({
    id: children[index].id,
    entity: args.parent,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      position: generateKeyBetween(
        next.data.position,
        children[index + 2]?.data.position || null,
      ),
      value: args.entityID,
    },
  });
};

const createEntity: Mutation<
  Array<{ entityID: string; permission_set: string }>
> = async (args, ctx) => {
  for (let newentity of args) {
    await ctx.createEntity(newentity);
  }
};

const createDraft: Mutation<{
  mailboxEntity: string;
  newEntity: string;
  permission_set: string;
  firstBlockEntity: string;
  firstBlockFactID: string;
}> = async (args, ctx) => {
  let [existingDraft] = await ctx.scanIndex.eav(
    args.mailboxEntity,
    "mailbox/draft",
  );
  if (existingDraft) return;
  await ctx.createEntity({
    entityID: args.newEntity,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.mailboxEntity,
    attribute: "mailbox/draft",
    data: { type: "reference", value: args.newEntity },
  });
  await addBlock(
    {
      factID: args.firstBlockFactID,
      permission_set: args.permission_set,
      newEntityID: args.firstBlockEntity,
      type: "text",
      parent: args.newEntity,
      position: "a0",
    },
    ctx,
  );
};

const archiveDraft: Mutation<{
  mailboxEntity: string;
  archiveEntity: string;
  newBlockEntity: string;
  entity_set: string;
}> = async (args, ctx) => {
  let [existingDraft] = await ctx.scanIndex.eav(
    args.mailboxEntity,
    "mailbox/draft",
  );
  if (!existingDraft) return;

  let [archive] = await ctx.scanIndex.eav(
    args.mailboxEntity,
    "mailbox/archive",
  );
  let archiveEntity = archive?.data.value;
  if (!archive) {
    archiveEntity = args.archiveEntity;
    await ctx.createEntity({
      entityID: archiveEntity,
      permission_set: args.entity_set,
    });
    await ctx.assertFact({
      entity: args.mailboxEntity,
      attribute: "mailbox/archive",
      data: { type: "reference", value: archiveEntity },
    });
  }

  let archiveChildren = await ctx.scanIndex.eav(archiveEntity, "card/block");
  let firstChild = archiveChildren.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[0];

  await ctx.createEntity({
    entityID: args.newBlockEntity,
    permission_set: args.entity_set,
  });
  await ctx.assertFact({
    entity: args.newBlockEntity,
    attribute: "block/type",
    data: { type: "block-type-union", value: "card" },
  });

  await ctx.assertFact({
    entity: args.newBlockEntity,
    attribute: "block/card",
    data: { type: "reference", value: existingDraft.data.value },
  });

  await ctx.assertFact({
    entity: archiveEntity,
    attribute: "card/block",
    data: {
      type: "ordered-reference",
      value: args.newBlockEntity,
      position: generateKeyBetween(null, firstChild?.data.position),
    },
  });

  await ctx.retractFact(existingDraft.id);
};

const retractAttribute: Mutation<{
  entity: string;
  attribute:
    | keyof FilterAttributes<{ cardinality: "one" }>
    | Array<keyof FilterAttributes<{ cardinality: "one" }>>;
}> = async (args, ctx) => {
  for (let a of [args.attribute].flat()) {
    let fact = (await ctx.scanIndex.eav(args.entity, a))[0];
    if (fact) await ctx.retractFact(fact.id);
  }
};

const toggleTodoState: Mutation<{ entityID: string }> = async (args, ctx) => {
  let [checked] = await ctx.scanIndex.eav(args.entityID, "block/check-list");
  if (!checked) {
    await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/check-list",
      data: { type: "boolean", value: false },
    });
  } else if (!checked.data.value) {
    await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/check-list",
      data: { type: "boolean", value: true },
    });
  } else {
    await ctx.retractFact(checked.id);
  }
};

const addPollOption: Mutation<{
  pollEntity: string;
  pollOptionEntity: string;
  pollOptionName: string;
  permission_set: string;
  factID: string;
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.pollOptionEntity,
    permission_set: args.permission_set,
  });

  await ctx.assertFact({
    entity: args.pollOptionEntity,
    attribute: "poll-option/name",
    data: { type: "string", value: args.pollOptionName },
  });

  let children = await ctx.scanIndex.eav(args.pollEntity, "poll/options");
  let lastChild = children.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[children.length - 1];

  await ctx.assertFact({
    entity: args.pollEntity,
    id: args.factID,
    attribute: "poll/options",
    data: {
      type: "ordered-reference",
      value: args.pollOptionEntity,
      position: generateKeyBetween(lastChild?.data.position || null, null),
    },
  });
};

const removePollOption: Mutation<{
  optionEntity: string;
}> = async (args, ctx) => {
  await ctx.deleteEntity(args.optionEntity);
};

const addGalleryImage: Mutation<{
  galleryEntity: string;
  imageEntity: string;
  permission_set: string;
  factID: string;
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.imageEntity,
    permission_set: args.permission_set,
  });

  let children = await ctx.scanIndex.eav(args.galleryEntity, "gallery/image");
  let lastChild = children.toSorted((a, b) =>
    a.data.position > b.data.position ? 1 : -1,
  )[children.length - 1];

  await ctx.assertFact({
    entity: args.galleryEntity,
    id: args.factID,
    attribute: "gallery/image",
    data: {
      type: "ordered-reference",
      value: args.imageEntity,
      position: generateKeyBetween(lastChild?.data.position || null, null),
    },
  });
};

const removeGalleryImage: Mutation<{
  imageEntity: string;
}> = async (args, ctx) => {
  await ctx.deleteEntity(args.imageEntity);
};

const updatePublicationDraft: Mutation<{
  title?: string;
  description?: string;
  tags?: string[];
  localPublishedAt?: string | null;
  preferences?: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
}> = async (args, ctx) => {
  await ctx.runOnServer(async (serverCtx) => {
    const updates: {
      description?: string;
      title?: string;
      tags?: string[];
      preferences?: {
        showComments?: boolean;
        showMentions?: boolean;
        showRecommends?: boolean;
      } | null;
    } = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.title !== undefined) updates.title = args.title;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    if (Object.keys(updates).length > 0) {
      // First try to update leaflets_in_publications (for publications)
      const { data: pubResult } = await serverCtx.supabase
        .from("leaflets_in_publications")
        .update(updates)
        .eq("leaflet", ctx.permission_token_id)
        .select("leaflet");

      // If no rows were updated in leaflets_in_publications,
      // try leaflets_to_documents (for standalone documents)
      if (!pubResult || pubResult.length === 0) {
        await serverCtx.supabase
          .from("leaflets_to_documents")
          .update(updates)
          .eq("leaflet", ctx.permission_token_id);
      }
    }
  });
  await ctx.runOnClient(async ({ tx }) => {
    if (args.title !== undefined) await tx.set("publication_title", args.title);
    if (args.description !== undefined)
      await tx.set("publication_description", args.description);
    if (args.tags !== undefined) await tx.set("publication_tags", args.tags);
    if (args.localPublishedAt !== undefined)
      await tx.set("publication_local_published_at", args.localPublishedAt);
    if (args.preferences !== undefined)
      await tx.set("post_preferences", args.preferences);
  });
};

const updateLeafletMetadata: Mutation<{
  title?: string;
  description?: string | null;
}> = async (args, ctx) => {
  await ctx.runOnServer(async (serverCtx) => {
    const updates: { title?: string; description?: string | null } = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (Object.keys(updates).length === 0) return;

    const { data: writerToken } = await serverCtx.supabase
      .from("permission_tokens")
      .select("root_entity, permission_token_rights(write)")
      .eq("id", ctx.permission_token_id)
      .single();
    if (!writerToken) return;
    const hasWrite = writerToken.permission_token_rights.some((r) => r.write);
    if (!hasWrite) return;

    await serverCtx.supabase
      .from("permission_tokens")
      .update(updates)
      .eq("root_entity", writerToken.root_entity);
  });
};

// Toggle a draft contributor (the byline for this draft). The selected dids
// live in the leaflet_contributors table and are pulled into Replicache under
// the "draft_contributors" key, so the byline syncs live across collaborators.
const toggleDraftContributor: Mutation<{
  contributor_did: string;
  selected: boolean;
}> = async (args, ctx) => {
  await ctx.runOnServer(async ({ supabase }) => {
    let { contributor_did } = args;
    let leaflet = ctx.permission_token_id;

    if (!args.selected) {
      await supabase
        .from("leaflet_contributors")
        .delete()
        .eq("leaflet", leaflet)
        .eq("contributor_did", contributor_did);
      return;
    }

    // Adding: the target must be the publication owner or a confirmed contributor.
    let { data: link } = await supabase
      .from("leaflets_in_publications")
      .select("publication, publications(identity_did)")
      .eq("leaflet", leaflet)
      .maybeSingle();
    if (!link?.publication) return;

    let isOwner = contributor_did === link.publications?.identity_did;
    if (!isOwner) {
      let { data: pubContrib } = await supabase
        .from("publication_contributors")
        .select("confirmed")
        .eq("publication_uri", link.publication)
        .eq("contributor_did", contributor_did)
        .maybeSingle();
      if (!pubContrib?.confirmed) return;
    }

    await supabase
      .from("leaflet_contributors")
      .upsert(
        { leaflet, contributor_did },
        { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
      );
  });
  await ctx.runOnClient(async ({ tx }) => {
    let current = (await tx.get<string[]>("draft_contributors")) ?? [];
    let next = args.selected
      ? current.includes(args.contributor_did)
        ? current
        : [...current, args.contributor_did]
      : current.filter((d) => d !== args.contributor_did);
    await tx.set("draft_contributors", next);
  });
};

const createFootnote: Mutation<{
  footnoteEntityID: string;
  blockID: string;
  permission_set: string;
  position: string;
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.footnoteEntityID,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.blockID,
    attribute: "block/footnote",
    data: {
      type: "ordered-reference",
      value: args.footnoteEntityID,
      position: args.position,
    },
  });
};

const deleteFootnote: Mutation<{
  footnoteEntityID: string;
  blockID: string;
}> = async (args, ctx) => {
  let footnotes = await ctx.scanIndex.eav(args.blockID, "block/footnote");
  let fact = footnotes.find((f) => f.data.value === args.footnoteEntityID);
  if (fact) await ctx.retractFact(fact.id);
  await ctx.deleteEntity(args.footnoteEntityID);
};

// A comment and a reply share the same body: an entity holding the YJS
// content plus author/created-at facts, all carrying the author's did so the
// server's authentication gate (sessionDid must match author_did) verifies
// authorship. Content is a base64-encoded YJS update, composed locally and
// only persisted on submit.
async function createAuthoredEntity(
  ctx: MutationContext,
  args: {
    entityID: string;
    permission_set: string;
    authorDid: string;
    createdAt: string;
    content: string;
  },
) {
  await ctx.createEntity({
    entityID: args.entityID,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.entityID,
    attribute: "block/text",
    data: { type: "text", value: args.content },
    author_did: args.authorDid,
  });
  await ctx.assertFact({
    entity: args.entityID,
    attribute: "comment/author",
    data: { type: "string", value: args.authorDid },
    author_did: args.authorDid,
  });
  await ctx.assertFact({
    entity: args.entityID,
    attribute: "comment/created-at",
    data: { type: "string", value: args.createdAt },
    author_did: args.authorDid,
  });
}

const createEditorComment: Mutation<{
  commentEntityID: string;
  blockID: string;
  permission_set: string;
  position: string;
  authorDid: string;
  createdAt: string;
  anchorStart: number;
  anchorEnd: number;
  content: string;
}> = async (args, ctx) => {
  await createAuthoredEntity(ctx, { ...args, entityID: args.commentEntityID });
  await ctx.assertFact({
    entity: args.blockID,
    attribute: "block/comment",
    data: {
      type: "ordered-reference",
      value: args.commentEntityID,
      position: args.position,
    },
  });
  await ctx.assertFact({
    entity: args.commentEntityID,
    attribute: "comment/anchor-start",
    data: { type: "number", value: args.anchorStart },
  });
  await ctx.assertFact({
    entity: args.commentEntityID,
    attribute: "comment/anchor-end",
    data: { type: "number", value: args.anchorEnd },
  });
};

const createEditorCommentReply: Mutation<{
  replyEntityID: string;
  commentEntityID: string;
  permission_set: string;
  position: string;
  authorDid: string;
  createdAt: string;
  content: string;
}> = async (args, ctx) => {
  await createAuthoredEntity(ctx, { ...args, entityID: args.replyEntityID });
  await ctx.assertFact({
    entity: args.commentEntityID,
    attribute: "comment/reply",
    data: {
      type: "ordered-reference",
      value: args.replyEntityID,
      position: args.position,
    },
  });
};

const deleteEditorComment: Mutation<{
  commentEntityID: string;
  blockID: string;
}> = async (args, ctx) => {
  // Fired both when a thread is resolved and by the editor's orphan diff when a
  // comment's anchor text is deleted. Deletes the root comment and all replies.
  let comments = await ctx.scanIndex.eav(args.blockID, "block/comment");
  let fact = comments.find((f) => f.data.value === args.commentEntityID);
  if (fact) await ctx.retractFact(fact.id);
  let replies = await ctx.scanIndex.eav(args.commentEntityID, "comment/reply");
  for (let reply of replies) {
    await ctx.deleteEntity(reply.data.value);
  }
  await ctx.deleteEntity(args.commentEntityID);
};

const deleteEditorCommentReply: Mutation<{
  replyEntityID: string;
  commentEntityID: string;
}> = async (args, ctx) => {
  let replies = await ctx.scanIndex.eav(args.commentEntityID, "comment/reply");
  let fact = replies.find((f) => f.data.value === args.replyEntityID);
  if (fact) await ctx.retractFact(fact.id);
  await ctx.deleteEntity(args.replyEntityID);
};

// Replace a comment or reply body in place. Only the original author may
// edit. The new content is a full YJS doc state with no shared history with
// the old one, so we retract the existing block/text and assert the new value
// rather than letting assertFact merge two independent docs together.
const editEditorComment: Mutation<{
  entityID: string;
  authorDid: string;
  content: string;
}> = async (args, ctx) => {
  let author = await ctx.scanIndex.eav(args.entityID, "comment/author");
  if (author[0]?.data.value !== args.authorDid) return;
  let existing = await ctx.scanIndex.eav(args.entityID, "block/text");
  for (let fact of existing) await ctx.retractFact(fact.id);
  await ctx.assertFact({
    entity: args.entityID,
    attribute: "block/text",
    data: { type: "text", value: args.content },
    author_did: args.authorDid,
  });
};

export const mutations = {
  retractAttribute,
  addBlock,
  addCanvasBlock,
  addLastBlock,
  outdentBlock,
  moveBlockUp,
  moveBlockDown,
  addPageLinkBlock,
  addPublicationNavPage,
  addPublicationNavLink,
  removePublicationNavEntry,
  moveBlock,
  assertFact,
  retractFact,
  removeBlock,
  deleteEntity,
  moveChildren,
  increaseHeadingLevel,
  archiveDraft,
  toggleTodoState,
  createDraft,
  createEntity,
  addPollOption,
  removePollOption,
  addGalleryImage,
  removeGalleryImage,
  updatePublicationDraft,
  updateLeafletMetadata,
  toggleDraftContributor,
  createFootnote,
  deleteFootnote,
  createEditorComment,
  createEditorCommentReply,
  deleteEditorComment,
  deleteEditorCommentReply,
  editEditorComment,
};
