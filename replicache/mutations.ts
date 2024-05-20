import { Fact } from ".";

type MutationContext = {
  createEntity: (entityID: string) => Promise<boolean>;
  assertFact: (f: Omit<Fact, "id"> & { id?: string }) => Promise<void>;
};

type Mutation<T> = (args: T, ctx: MutationContext) => Promise<void>;

const addBlock: Mutation<{ parent: string; newEntityID: string }> = async (
  args,
  ctx,
) => {
  //How do we create the new entity?
  // We don't actually sync the entities to the client yet, but maybe we should
  // Should I keep the mutation id on a parent or
  await ctx.createEntity(args.newEntityID);
  await ctx.assertFact({
    entity: args.parent,
    data: { type: "reference", value: args.newEntityID },
    attribute: "block/card",
  });
};

const assertFact: Mutation<Omit<Fact, "id"> & { id?: string }> = async (
  args,
  ctx,
) => {
  await ctx.assertFact(args);
};

export const mutations = {
  addBlock,
  assertFact,
};
