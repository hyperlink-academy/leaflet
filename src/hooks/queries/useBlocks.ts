import { Block } from "components/Blocks";
import { useMemo } from "react";
import { ReadTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, useReplicache } from "src/replicache";

export const useBlocks = (entityID: string) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      rep.initialFacts
        .filter((f) => f.attribute === "card/block" && f.entity === entityID)
        .map((_f) => {
          let block = _f as Fact<"card/block">;
          let type = rep.initialFacts.find(
            (f) =>
              f.entity === block.data.value && f.attribute === "block/type",
          ) as Fact<"block/type"> | undefined;
          if (!type) return null;
          return { ...block.data, type: type.data.value, parent: block.entity };
        }),
    [rep.initialFacts, entityID],
  );
  let data =
    useSubscribe(rep?.rep, async (tx) => getBlocksWithType(tx, entityID)) ||
    initialValue;
  return data
    .flatMap((f) => (!f ? [] : [f]))
    .sort((a, b) => {
      return a.position > b.position ? 1 : -1;
    });
};

export const getBlocksWithType = async (
  tx: ReadTransaction,
  entityID: string,
) => {
  let initialized = await tx.get("initialized");
  if (!initialized) return null;
  let blocks = await tx
    .scan<
      Fact<"card/block">
    >({ indexName: "eav", prefix: `${entityID}-card/block` })
    .toArray();

  return await Promise.all(
    blocks.map(async (b) => {
      let type = (
        await tx
          .scan<
            Fact<"block/type">
          >({ prefix: `${b.data.value}-block/type`, indexName: "eav" })
          .toArray()
      )[0];
      if (!type) return null;
      return {
        ...b.data,
        type: type.data.value,
        parent: b.entity,
      } as Block;
    }),
  );
};
