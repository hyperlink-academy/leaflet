import { DeepReadonly } from "replicache";
import { Fact } from ".";
import { Attributes } from "./attributes";

export type MutationContext = {
  createEntity: (entityID: string) => Promise<boolean>;
  scanIndex: {
    eav: <A extends keyof typeof Attributes>(
      entity: string,
      attribute: A,
    ) => Promise<DeepReadonly<Fact<A>[]>>;
  };
  assertFact: <A extends keyof typeof Attributes>(
    f: Omit<Fact<A>, "id"> & { id?: string },
  ) => Promise<void>;
};

type Mutation<T> = (args: T, ctx: MutationContext) => Promise<void>;

const addBlock: Mutation<{
  parent: string;
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
};

const assertFact: Mutation<
  Omit<Fact<keyof typeof Attributes>, "id"> & { id?: string }
> = async (args, ctx) => {
  await ctx.assertFact(args);
};

export const mutations = {
  addBlock,
  assertFact,
};
