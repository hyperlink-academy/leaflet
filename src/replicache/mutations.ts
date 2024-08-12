import { DeepReadonly } from "replicache";
import { Fact } from ".";
import { Attributes, FilterAttributes } from "./attributes";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { generateKeyBetween } from "fractional-indexing";

export type MutationContext = {
  createEntity: (args: {
    entityID: string;
    permission_set: string;
  }) => Promise<boolean>;
  scanIndex: {
    eav: <A extends keyof typeof Attributes>(
      entity: string,
      attribute: A,
    ) => Promise<DeepReadonly<Fact<A>[]>>;
  };
  deleteEntity: (entity: string) => Promise<void>;
  assertFact: <A extends keyof typeof Attributes>(
    f: Omit<Fact<A>, "id"> & { id?: string },
  ) => Promise<void>;
  retractFact: (id: string) => Promise<void>;
  runOnServer(
    cb: (ctx: { supabase: SupabaseClient<Database> }) => Promise<void>,
  ): Promise<void>;
  runOnClient(
    cb: (ctx: { supabase: SupabaseClient<Database> }) => Promise<void>,
  ): Promise<void>;
};

type Mutation<T> = (args: T, ctx: MutationContext) => Promise<void>;

const addBlock: Mutation<{
  parent: string;
  permission_set: string;
  factID: string;
  type: Fact<"block/type">["data"]["value"];
  newEntityID: string;
  position: string;
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
  position: { type: "first" } | { type: "end" };
}> = async (args, ctx) => {
  let children = (
    await ctx.scanIndex.eav(args.oldParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let newSiblings = (
    await ctx.scanIndex.eav(args.newParent, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let block = children.find((f) => f.data.value === args.block);
  if (!block) return;
  await ctx.retractFact(block.id);
  let newPosition;
  switch (args.position.type) {
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
    await ctx.retractFact(child.id);
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
  let currentSiblingsAfter = currentSiblings.slice(currentFactIndex + 1);
  let currentChildren = (
    await ctx.scanIndex.eav(args.block, "card/block")
  ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
  let lastPosition =
    currentChildren[currentChildren.length - 1]?.data.position || null;
  await ctx.retractFact(currentSiblings[currentFactIndex].id);
  for (let sib of currentSiblingsAfter) {
    await ctx.retractFact(sib.id);
    lastPosition = generateKeyBetween(lastPosition, null);
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

  let index = newSiblings.findIndex((f) => f.data.value === args.after);
  if (index === -1) return;
  let newPosition = generateKeyBetween(
    newSiblings[index]?.data.position,
    newSiblings[index + 1]?.data.position || null,
  );
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

const addCardBlock: Mutation<{
  permission_set: string;
  blockEntity: string;
  firstBlockEntity: string;
  firstBlockFactID: string;
  cardEntity: string;
}> = async (args, ctx) => {
  await ctx.createEntity({
    entityID: args.cardEntity,
    permission_set: args.permission_set,
  });
  await ctx.assertFact({
    entity: args.blockEntity,
    attribute: "block/card",
    data: { type: "reference", value: args.cardEntity },
  });
  await addBlock(
    {
      factID: args.firstBlockFactID,
      permission_set: args.permission_set,
      newEntityID: args.firstBlockEntity,
      type: "heading",
      parent: args.cardEntity,
      position: "a0",
    },
    ctx,
  );
};

const retractFact: Mutation<{ factID: string }> = async (args, ctx) => {
  await ctx.retractFact(args.factID);
};

const removeBlock: Mutation<
  { blockEntity: string } | { blockEntity: string }[]
> = async (args, ctx) => {
  for (let block of [args].flat()) {
    let images = await ctx.scanIndex.eav(block.blockEntity, "block/image");
    ctx.runOnServer(async ({ supabase }) => {
      for (let image of images) {
        let paths = image.data.src.split("/");
        await supabase.storage
          .from("minilink-user-assets")
          .remove([paths[paths.length - 1]]);
      }
    });
    ctx.runOnClient(async () => {
      let cache = await caches.open("minilink-user-assets");
      for (let image of images) {
        await cache.delete(image.data.src);
      }
    });
    await ctx.deleteEntity(block.blockEntity);
  }
};

const assertFact: Mutation<
  Omit<Fact<keyof typeof Attributes>, "id"> & { id?: string }
> = async (args, ctx) => {
  await ctx.assertFact(args);
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
  await ctx.retractFact(children[index].id);
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
const moveBlockDown: Mutation<{ entityID: string; parent: string }> = async (
  args,
  ctx,
) => {
  let children = (await ctx.scanIndex.eav(args.parent, "card/block")).toSorted(
    (a, b) => (a.data.position > b.data.position ? 1 : -1),
  );
  let index = children.findIndex((f) => f.data.value === args.entityID);
  if (index === -1) return;
  let next = children[index + 1];
  if (!next) return;
  await ctx.retractFact(children[index].id);
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

const retractAttribute: Mutation<{
  entity: string;
  attribute: keyof FilterAttributes<{ cardinality: "one" }>;
}> = async (args, ctx) => {
  let fact = (await ctx.scanIndex.eav(args.entity, args.attribute))[0];
  if (fact) await ctx.retractFact(fact.id);
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

export const mutations = {
  retractAttribute,
  addBlock,
  addLastBlock,
  outdentBlock,
  moveBlockUp,
  moveBlockDown,
  addCardBlock,
  moveBlock,
  assertFact,
  retractFact,
  removeBlock,
  moveChildren,
  increaseHeadingLevel,
  toggleTodoState,
};
