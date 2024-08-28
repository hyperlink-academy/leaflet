import { Fact, useEntity, useReplicache } from "../replicache";

export const isTextBlock: {
  [k in Fact<"block/type">["data"]["value"]]?: boolean;
} = {
  text: true,
  heading: true,
};
