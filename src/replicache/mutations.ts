import { DeepReadonly, Replicache, WriteTransaction } from "replicache";
import type { Fact, ReplicacheMutators } from ".";
import type { Attribute, Attributes, FilterAttributes } from "./attributes";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";

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
  await ctx.retractFact(block.id);
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

        // Clear cover image if this block is the cover image
        // First try leaflets_in_publications
        const { data: pubResult } = await supabase
          .from("leaflets_in_publications")
          .update({ cover_image: null })
          .eq("leaflet", ctx.permission_token_id)
          .eq("cover_image", block.blockEntity)
          .select("leaflet");

        // If no rows updated, try leaflets_to_documents
        if (!pubResult || pubResult.length === 0) {
          await supabase
            .from("leaflets_to_documents")
            .update({ cover_image: null })
            .eq("leaflet", ctx.permission_token_id)
            .eq("cover_image", block.blockEntity);
        }
      }
    });
    await ctx.runOnClient(async ({ tx }) => {
      let cache = await caches.open("minilink-user-assets");
      if (image) {
        await cache.delete(image.data.src + "?local");

        // Clear cover image in client state if this block was the cover image
        let currentCoverImage = await tx.get("publication_cover_image");
        if (currentCoverImage === block.blockEntity) {
          await tx.set("publication_cover_image", null);
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

const updatePublicationDraft: Mutation<{
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
  localPublishedAt?: string | null;
  preferences?: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
}> = async (args, ctx) => {
  await ctx.runOnServer(async (serverCtx) => {
    console.log("updating");
    const updates: {
      description?: string;
      title?: string;
      tags?: string[];
      cover_image?: string | null;
      preferences?: {
        showComments?: boolean;
        showMentions?: boolean;
        showRecommends?: boolean;
      } | null;
    } = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.title !== undefined) updates.title = args.title;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.cover_image !== undefined) updates.cover_image = args.cover_image;
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
    if (args.cover_image !== undefined)
      await tx.set("publication_cover_image", args.cover_image);
    if (args.localPublishedAt !== undefined)
      await tx.set("publication_local_published_at", args.localPublishedAt);
    if (args.preferences !== undefined)
      await tx.set("post_preferences", args.preferences);
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
  updatePublicationDraft,
};
