import { DeepReadonly } from "replicache";
import { Fact } from ".";
import { Attributes } from "./attributes";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";

export type MutationContext = {
  createEntity: (entityID: string) => Promise<boolean>;
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
  type: Fact<"block/type">["data"]["value"];
  newEntityID: string;
  position: string;
}> = async (args, ctx) => {
  await ctx.createEntity(args.newEntityID);
  await ctx.assertFact({
    entity: args.parent,
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

const retractFact: Mutation<{ factID: string }> = async (args, ctx) => {
  await ctx.retractFact(args.factID);
};

const removeBlock: Mutation<{ blockEntity: string }> = async (args, ctx) => {
  let images = await ctx.scanIndex.eav(args.blockEntity, "block/image");
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
  await ctx.deleteEntity(args.blockEntity);
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
  if (!headinglevel)
    await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/heading-level",
      data: { type: "number", value: 1 },
    });
  else if (headinglevel?.data.value === 4) return;
  else
    return await ctx.assertFact({
      entity: args.entityID,
      attribute: "block/heading-level",
      data: { type: "number", value: headinglevel.data.value + 1 },
    });
};

export const mutations = {
  addBlock,
  assertFact,
  retractFact,
  removeBlock,
  increaseHeadingLevel,
};
